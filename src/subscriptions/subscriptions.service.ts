import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { ListSubscriptionsQueryDto } from './dto/list-subscriptions-query.dto';

@Injectable()
export class SubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(appId: string, dto: CreateSubscriptionDto) {
    try {
      const existing = await this.prisma.eventSubscription.findFirst(
        {
          where : {
            appId,
            eventName: dto.eventName,
            recipientEmail: dto.recipientEmail,
          }
        }
      )
      if (existing && existing.isActive) {
        throw new ConflictException('Subscription already exists');
      }
      const emailUser = await this.prisma.user.findUnique({
        where: { email: dto.recipientEmail },
      });
      if (!emailUser) {
        throw new NotFoundException('Recipient email does not correspond to a registered user');
      }
      return await this.prisma.eventSubscription.create({
        data: {
          appId,
          eventName: dto.eventName,
          recipientEmail: dto.recipientEmail,
          isActive: true,
        },
      });
    } catch (error) {
      const isUniqueViolation =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002';

      if (!isUniqueViolation) {
        throw error;
      }

      const existing = await this.prisma.eventSubscription.findFirst({
        where: {
          appId,
          eventName: dto.eventName,
          recipientEmail: dto.recipientEmail,
        },
      });

      if (!existing) {
        // Defensive fallback: if we can't find it, rethrow the original error.
        throw error;
      }

      if (!existing.isActive) {
        return this.prisma.eventSubscription.update({
          where: { id: existing.id },
          data: { isActive: true },
        });
      }

      return existing;
    }
  }

  async list(appId: string, query: ListSubscriptionsQueryDto) {
    const skip = (query.page - 1) * query.limit;

    const [items, total] = await Promise.all([
      this.prisma.eventSubscription.findMany({
        where: { appId, isActive: true },
        skip,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.eventSubscription.count({
        where: { appId, isActive: true },
      }),
    ]);

    return {
      items,
      page: query.page,
      limit: query.limit,
      total,
    };
  }

  async findById(subscriptionId: string) {
    const subscription = await this.prisma.eventSubscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    return subscription;
  }

  async remove(appId: string, subscriptionId: string) {
    const subscription = await this.findById(subscriptionId);

    if (subscription.appId !== appId) {
      throw new NotFoundException('Subscription not found');
    }

    await this.prisma.eventSubscription.update({
      where: { id: subscriptionId },
      data: { isActive: false },
    });

    return { success: true };
  }

  async findSubscribersForEvent(eventName: string) {
    return this.prisma.eventSubscription.findMany({
      where: { eventName, isActive: true },
      include: { app: true },
    });
  }

  async findSubscribersForAppEvent(appId: string, eventName: string) {
    return this.prisma.eventSubscription.findMany({
      where: { appId, eventName, isActive: true },
      include: { app: true },
    });
  }
}
