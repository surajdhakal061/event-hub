import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { ListSubscriptionsQueryDto } from './dto/list-subscriptions-query.dto';

@Injectable()
export class SubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(appId: string, dto: CreateSubscriptionDto) {
    const subscription = await this.prisma.eventSubscription.create({
      data: {
        appId,
        eventName: dto.eventName,
        recipientEmail: dto.recipientEmail,
      },
    });

    return subscription;
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
}
