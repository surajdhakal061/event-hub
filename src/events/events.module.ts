import { Module, forwardRef } from '@nestjs/common';
import { AppsModule } from '../apps/apps.module';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { DeliveriesModule } from '../deliveries/deliveries.module';
import { TemplatesModule } from '../templates/templates.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { EventsController } from './events.controller';
import { EventsProcessorService } from './events-processor.service';
import { EventsService } from './events.service';

@Module({
  imports: [TemplatesModule, DeliveriesModule, AppsModule, forwardRef(() => SubscriptionsModule)],
  controllers: [EventsController],
  providers: [EventsService, EventsProcessorService, ApiKeyGuard],
  exports: [EventsService],
})
export class EventsModule {}
