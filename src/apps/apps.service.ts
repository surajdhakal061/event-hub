import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAppDto } from './dto/create-app.dto';
import { ListAppsQueryDto } from './dto/list-apps-query.dto';

@Injectable()
export class AppsService {
  constructor(private readonly prisma: PrismaService) {}

  create(userId: string, dto: CreateAppDto) {
    return this.prisma.app.create({
      data: {
        userId,
        name: dto.name,
        description: dto.description,
      },
    });
  }

  async list(userId: string, query: ListAppsQueryDto) {
    const skip = (query.page - 1) * query.limit;
    const [items, total] = await Promise.all([
      this.prisma.app.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: query.limit,
      }),
      this.prisma.app.count({ where: { userId } }),
    ]);

    return {
      items,
      page: query.page,
      limit: query.limit,
      total,
    };
  }

  async generateApiKey(userId: string, appId: string) {
    const app = await this.prisma.app.findUnique({ where: { id: appId } });
    if (!app) {
      throw new NotFoundException('App not found');
    }
    if (app.userId !== userId) {
      throw new ForbiddenException('You cannot manage this app');
    }

    const rawApiKey = this.createRawApiKey();
    const keyHash = this.hashApiKey(rawApiKey);

    const created = await this.prisma.apiKey.create({
      data: {
        appId,
        keyHash,
        keyPrefix: rawApiKey.slice(0, 12),
        keyLast4: rawApiKey.slice(-4),
      },
    });

    return {
      keyId: created.id,
      keyPrefix: created.keyPrefix,
      keyLast4: created.keyLast4,
      apiKey: rawApiKey,
      createdAt: created.createdAt,
    };
  }

  async remove(userId: string, appId: string) {
    await this.ensureOwnedByUser(userId, appId);

    await this.prisma.app.delete({
      where: { id: appId },
    });

    return {
      message: 'App deleted successfully',
      appId,
    };
  }

  async validateApiKey(rawApiKey: string) {
    const keyHash = this.hashApiKey(rawApiKey);
    const found = await this.prisma.apiKey.findFirst({
      where: {
        keyHash,
        isActive: true,
        revokedAt: null,
      },
      include: {
        app: true,
      },
    });

    if (!found) {
      return null;
    }

    await this.prisma.apiKey.update({
      where: { id: found.id },
      data: { lastUsedAt: new Date() },
    });

    return {
      appId: found.app.id,
      appName: found.app.name,
      ownerId: found.app.userId,
    };
  }

  async ensureOwnedByUser(userId: string, appId: string) {
    const app = await this.prisma.app.findUnique({ where: { id: appId } });
    if (!app) {
      throw new NotFoundException('App not found');
    }
    if (app.userId !== userId) {
      throw new ForbiddenException('You cannot access this app');
    }

    return app;
  }

  private createRawApiKey() {
    return `eh_live_${randomBytes(24).toString('hex')}`;
  }

  private hashApiKey(rawApiKey: string) {
    return createHash('sha256').update(rawApiKey).digest('hex');
  }
}
