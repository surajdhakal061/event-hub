import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { EventStatus, Prisma } from '@prisma/client';
import { AppsService } from '../apps/apps.service';
import { DeliveriesService } from '../deliveries/deliveries.service';
import { DeliveryChannelService } from '../deliveries/delivery-channel.service';
import { PrismaService } from '../prisma/prisma.service';
import { TemplatesService } from '../templates/templates.service';
import { ListEventsQueryDto } from './dto/list-events-query.dto';
import { EventsProcessorService } from './events-processor.service';
import { PublishEventDto } from './dto/publish-event.dto';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

@Injectable()
export class EventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly templatesService: TemplatesService,
    private readonly deliveriesService: DeliveriesService,
    private readonly deliveryChannelService: DeliveryChannelService,
    private readonly appsService: AppsService,
    private readonly eventsProcessorService: EventsProcessorService,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  async publish(appId: string, dto: PublishEventDto) {
    let templateId: string | null = null;

    if (dto.templateName) {
      const template = await this.templatesService.findByNameForApp(
        appId,
        dto.templateName,
      );
      templateId = template.id;
    }

    const event = await this.prisma.event.create({
      data: {
        appId,
        templateId,
        eventName: dto.eventName,
        recipient: dto.recipient,
        payload: dto.payload as Prisma.InputJsonValue,
      },
    });

    const enqueued = await this.eventsProcessorService.enqueueEvent(event.id);
    if (!enqueued) {
      setTimeout(() => {
        void this.processSingleEvent(event.id);
      }, 0);
    }

    // Notify subscribers of this event type
    void this.notifySubscribers(event.id, dto.eventName, appId, dto);

    return {
      id: event.id,
      status: event.status,
      createdAt: event.createdAt,
    };
  }

  async list(userId: string, query: ListEventsQueryDto) {
    const skip = (query.page - 1) * query.limit;
    const appIds = await this.getOwnedAppIds(userId, query.appId);

    const where = {
      appId: { in: appIds },
      ...(query.status ? { status: query.status } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.event.findMany({
        where,
        include: {
          template: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: query.limit,
      }),
      this.prisma.event.count({ where }),
    ]);

    return {
      items,
      page: query.page,
      limit: query.limit,
      total,
    };
  }

  async processSingleEvent(eventId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: {
        template: true,
      },
    });

    if (!event || event.status !== EventStatus.PENDING) {
      return;
    }

    const payload = (event.payload ?? {}) as Record<string, unknown>;

    const subjectTemplate =
      event.template?.subject ?? `EventHub: ${event.eventName}`;
    const bodyTemplate =
      event.template?.body ??
      'Event {{eventName}} for app {{appId}} was triggered.';

    const subject = this.templatesService.render(subjectTemplate, {
      ...payload,
      eventName: event.eventName,
      appId: event.appId,
      recipient: event.recipient,
    });
    const body = this.templatesService.render(bodyTemplate, {
      ...payload,
      eventName: event.eventName,
      appId: event.appId,
      recipient: event.recipient,
    });

    try {
      const result = await this.deliveryChannelService.sendEmail({
        recipient: event.recipient,
        subject,
        body,
        payload,
      });

      await this.deliveriesService.createLog({
        eventId: event.id,
        recipient: event.recipient,
        success: result.success,
        providerResponse: result.providerResponse,
        errorMessage: result.errorMessage,
      });

      await this.prisma.event.update({
        where: { id: event.id },
        data: {
          status: result.success ? EventStatus.SENT : EventStatus.FAILED,
          processedAt: new Date(),
          failureReason: result.success ? null : result.errorMessage,
        },
      });
    } catch (error) {
      await this.deliveriesService.createLog({
        eventId: event.id,
        recipient: event.recipient,
        success: false,
        errorMessage: 'Unexpected processor error',
      });

      await this.prisma.event.update({
        where: { id: event.id },
        data: {
          status: EventStatus.FAILED,
          processedAt: new Date(),
          failureReason:
            error instanceof Error ? error.message : 'Unknown processing error',
        },
      });

      throw new InternalServerErrorException('Failed to process event');
    }
  }

  private async notifySubscribers(
    sourceEventId: string,
    eventName: string,
    publisherAppId: string,
    dto: PublishEventDto,
  ) {
    try {
      // Find all apps subscribed to this event type (excluding the publisher)
      const subscribers =
        await this.subscriptionsService.findSubscribersForEvent(eventName);

      if (subscribers.length === 0) {
        return;
      }

      // Create events for each subscriber
      for (const subscription of subscribers) {
        if (subscription.appId === publisherAppId) {
          // Don't Notify the publisher
          continue;
        }

        if (!subscription.recipientEmail) {
          continue;
        }

        try {
          // For now, we create a notification event
          const subscriberEvent = await this.prisma.event.create({
            data: {
              appId: subscription.appId,
              eventName: `${eventName}:subscription`,
              recipient: subscription.recipientEmail,
              payload: {
                sourceEventId,
                publisherAppId,
                originalEventName: eventName,
                payload: dto.payload,
              } as Prisma.InputJsonValue,
            },
          });

          // Enqueue for processing
          const enqueued =
            await this.eventsProcessorService.enqueueEvent(subscriberEvent.id);
          if (!enqueued) {
            setTimeout(() => {
              void this.processSingleEvent(subscriberEvent.id);
            }, 0);
          }
        } catch (error) {
          console.error(
            `Failed to notify subscriber ${subscription.appId} for event ${eventName}:`,
            error,
          );
        }
      }
    } catch (error) {
      console.error(
        `Error notifying subscribers for event ${eventName}:`,
        error,
      );
    }
  }

  private async getOwnedAppIds(userId: string, appId?: string) {
    if (appId) {
      const app = await this.appsService.ensureOwnedByUser(userId, appId);
      return [app.id];
    }

    const apps = await this.prisma.app.findMany({
      where: { userId },
      select: { id: true },
    });

    if (apps.length === 0) {
      throw new NotFoundException('No apps found for this user');
    }

    return apps.map((app) => app.id);
  }
}
