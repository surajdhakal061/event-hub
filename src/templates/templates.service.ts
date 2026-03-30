import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AppsService } from '../apps/apps.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { ListTemplatesQueryDto } from './dto/list-templates-query.dto';

@Injectable()
export class TemplatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly appsService: AppsService,
  ) {}

  async create(userId: string, dto: CreateTemplateDto) {
    await this.appsService.ensureOwnedByUser(userId, dto.appId);

    const existing = await this.prisma.template.findUnique({
      where: {
        appId_name: {
          appId: dto.appId,
          name: dto.name,
        },
      },
    });

    if (existing) {
      throw new BadRequestException(
        'Template name already exists for this app',
      );
    }

    return this.prisma.template.create({
      data: {
        appId: dto.appId,
        name: dto.name,
        subject: dto.subject,
        body: dto.body,
      },
    });
  }

  async list(userId: string, query: ListTemplatesQueryDto) {
    const skip = (query.page - 1) * query.limit;

    const appIds = await this.getOwnedAppIds(userId, query.appId);
    const where = {
      appId: {
        in: appIds,
      },
    };

    const [items, total] = await Promise.all([
      this.prisma.template.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: query.limit,
      }),
      this.prisma.template.count({ where }),
    ]);

    return {
      items,
      page: query.page,
      limit: query.limit,
      total,
    };
  }

  async findByNameForApp(appId: string, name: string) {
    const template = await this.prisma.template.findUnique({
      where: {
        appId_name: {
          appId,
          name,
        },
      },
    });

    if (!template) {
      throw new NotFoundException(`Template '${name}' not found for this app`);
    }

    return template;
  }

  render(content: string, payload: Record<string, unknown>) {
    return content.replace(/{{\s*(\w+)\s*}}/g, (_match, key: string) => {
      const value = payload[key];
      if (value === null || value === undefined) {
        return '';
      }
      return String(value);
    });
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
