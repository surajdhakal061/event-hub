import { Injectable } from '@nestjs/common';
import { EventStatus } from '@prisma/client';
import { AppsService } from '../apps/apps.service';
import { PrismaService } from '../prisma/prisma.service';
import { AnalyticsQueryDto } from './dto/analytics-query.dto';

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly appsService: AppsService,
  ) {}

  async overview(userId: string, query: AnalyticsQueryDto) {
    const appIds = await this.getOwnedAppIds(userId, query.appId);

    const where = {
      appId: {
        in: appIds,
      },
    };

    const [
      totalEvents,
      pendingCount,
      sentCount,
      failedCount,
      totalDeliveries,
      successfulDeliveries,
      failedDeliveries,
    ] = await Promise.all([
      this.prisma.event.count({ where }),
      this.prisma.event.count({
        where: { ...where, status: EventStatus.PENDING },
      }),
      this.prisma.event.count({
        where: { ...where, status: EventStatus.SENT },
      }),
      this.prisma.event.count({
        where: { ...where, status: EventStatus.FAILED },
      }),
      this.prisma.deliveryLog.count({
        where: {
          event: where,
        },
      }),
      this.prisma.deliveryLog.count({
        where: {
          event: where,
          success: true,
        },
      }),
      this.prisma.deliveryLog.count({
        where: {
          event: where,
          success: false,
        },
      }),
    ]);

    return {
      filters: {
        appId: query.appId ?? null,
      },
      events: {
        total: totalEvents,
        pending: pendingCount,
        sent: sentCount,
        failed: failedCount,
      },
      deliveries: {
        total: totalDeliveries,
        sent: successfulDeliveries,
        failed: failedDeliveries,
      },
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
