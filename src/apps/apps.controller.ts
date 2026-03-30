import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AppsService } from './apps.service';
import { CreateAppDto } from './dto/create-app.dto';
import { ListAppsQueryDto } from './dto/list-apps-query.dto';

@Controller('apps')
@UseGuards(JwtAuthGuard)
export class AppsController {
  constructor(private readonly appsService: AppsService) {}

  @Post()
  create(@CurrentUser() user: JwtUser, @Body() dto: CreateAppDto) {
    return this.appsService.create(user.sub, dto);
  }

  @Get()
  list(@CurrentUser() user: JwtUser, @Query() query: ListAppsQueryDto) {
    return this.appsService.list(user.sub, query);
  }

  @Post(':appId/api-keys')
  generateApiKey(@CurrentUser() user: JwtUser, @Param('appId') appId: string) {
    return this.appsService.generateApiKey(user.sub, appId);
  }

  @Delete(':appId')
  remove(@CurrentUser() user: JwtUser, @Param('appId') appId: string) {
    return this.appsService.remove(user.sub, appId);
  }
}
