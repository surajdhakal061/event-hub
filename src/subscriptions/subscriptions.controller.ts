import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AppsService } from '../apps/apps.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { ListSubscriptionsQueryDto } from './dto/list-subscriptions-query.dto';
import { SubscriptionsService } from './subscriptions.service';

@Controller('subscriptions')
@UseGuards(JwtAuthGuard)
export class SubscriptionsController {
  constructor(
    private readonly subscriptionsService: SubscriptionsService,
    private readonly appsService: AppsService,
  ) {}

  @Post()
  async create(
    @CurrentUser() user: JwtUser,
    @Query('appId') appId: string,
    @Body() dto: CreateSubscriptionDto,
  ) {
    // Verify user owns the app
    await this.appsService.ensureOwnedByUser(user.sub, appId);
    return this.subscriptionsService.create(appId, dto);
  }

  @Get()
  async list(
    @CurrentUser() user: JwtUser,
    @Query() query: ListSubscriptionsQueryDto,
  ) {
    // Verify user owns the app
    await this.appsService.ensureOwnedByUser(user.sub, query.appId);
    return this.subscriptionsService.list(query.appId, query);
  }

  @Delete(':subscriptionId')
  async remove(
    @CurrentUser() user: JwtUser,
    @Param('subscriptionId') subscriptionId: string,
    @Query('appId') appId: string,
  ) {
    // Verify user owns the app
    await this.appsService.ensureOwnedByUser(user.sub, appId);
    return this.subscriptionsService.remove(appId, subscriptionId);
  }
}
