import { Module } from '@nestjs/common';
import { AppsModule } from '../apps/apps.module';
import { DeliveriesController } from './deliveries.controller';
import { DeliveryChannelService } from './delivery-channel.service';
import { DeliveriesService } from './deliveries.service';

@Module({
  imports: [AppsModule],
  controllers: [DeliveriesController],
  providers: [DeliveriesService, DeliveryChannelService],
  exports: [DeliveriesService, DeliveryChannelService],
})
export class DeliveriesModule {}
