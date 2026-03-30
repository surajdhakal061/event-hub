import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { DeliveriesService } from './deliveries.service';
import { ListDeliveriesQueryDto } from './dto/list-deliveries-query.dto';

@Controller('deliveries')
@UseGuards(JwtAuthGuard)
export class DeliveriesController {
  constructor(private readonly deliveriesService: DeliveriesService) {}

  @Get()
  list(@CurrentUser() user: JwtUser, @Query() query: ListDeliveriesQueryDto) {
    return this.deliveriesService.list(user.sub, query);
  }
}
