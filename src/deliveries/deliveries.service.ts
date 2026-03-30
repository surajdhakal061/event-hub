import { Injectable } from '@nestjs/common';
import { AppsService } from '../apps/apps.service';
import { PrismaService } from '../prisma/prisma.service';
import { ListDeliveriesQueryDto } from './dto/list-deliveries-query.dto';

@Injectable()
export class DeliveriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly appsService: AppsService,
  ) {}

  createLog(input: {
    eventId: string;
    recipient: string;
    success: boolean;
    providerResponse?: string;
    errorMessage?: string;
  }) {
    return this.prisma.deliveryLog.create({
      data: {
        eventId: input.eventId,
        recipient: input.recipient,
        success: input.success,
        providerResponse: input.providerResponse,
        errorMessage: input.errorMessage,
      },
    });
  }

  async list(userId: string, query: ListDeliveriesQueryDto) {
    const skip = (query.page - 1) * query.limit;

    const appIds = await this.getOwnedAppIds(userId, query.appId);

    const where = {
      event: {
        appId: {
          in: appIds,
        },
      },
      ...(query.success === undefined ? {} : { success: query.success }),
    };

    const [items, total] = await Promise.all([
      this.prisma.deliveryLog.findMany({
        where,
        include: {
          event: {
            select: {
              id: true,
              appId: true,
              eventName: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: query.limit,
      }),
      this.prisma.deliveryLog.count({ where }),
    ]);

    return {
      items,
      page: query.page,
      limit: query.limit,
      total,
    };
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

    return apps.map((app) => app.id);
  }
}
