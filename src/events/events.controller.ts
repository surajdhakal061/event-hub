import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentApp } from '../common/decorators/current-app.decorator';
import type { ApiKeyAppContext } from '../common/decorators/current-app.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtUser } from '../common/decorators/current-user.decorator';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ListEventsQueryDto } from './dto/list-events-query.dto';
import { PublishEventDto } from './dto/publish-event.dto';
import { EventsService } from './events.service';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post('publish')
  @UseGuards(ApiKeyGuard)
  publish(
    @CurrentApp() appContext: ApiKeyAppContext,
    @Body() dto: PublishEventDto,
  ) {
    return this.eventsService.publish(appContext.appId, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  list(@CurrentUser() user: JwtUser, @Query() query: ListEventsQueryDto) {
    return this.eventsService.list(user.sub, query);
  }
}
