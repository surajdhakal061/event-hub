import { Module } from '@nestjs/common';
import { AppsModule } from '../apps/apps.module';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { DeliveriesModule } from '../deliveries/deliveries.module';
import { TemplatesModule } from '../templates/templates.module';
import { EventsController } from './events.controller';
import { EventsProcessorService } from './events-processor.service';
import { EventsService } from './events.service';

@Module({
  imports: [TemplatesModule, DeliveriesModule, AppsModule],
  controllers: [EventsController],
  providers: [EventsService, EventsProcessorService, ApiKeyGuard],
  exports: [EventsService],
})
export class EventsModule {}
