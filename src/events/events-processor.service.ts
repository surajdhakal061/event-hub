import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { Consumer, Kafka, Producer } from 'kafkajs';
import { EventsService } from './events.service';

@Injectable()
export class EventsProcessorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EventsProcessorService.name);
  private readonly topic = process.env.KAFKA_TOPIC ?? 'eventhub-events';
  private readonly brokers = (process.env.KAFKA_BROKERS ?? 'localhost:9092')
    .split(',')
    .map((broker) => broker.trim())
    .filter(Boolean);
  private readonly groupId =
    process.env.KAFKA_GROUP_ID ?? 'eventhub-worker-group';

  private kafka: Kafka | null = null;
  private producer: Producer | null = null;
  private consumer: Consumer | null = null;
  private active = false;

  constructor(private readonly moduleRef: ModuleRef) {}

  async onModuleInit() {
    const isEnabled = process.env.KAFKA_ENABLED !== 'false';
    if (!isEnabled) {
      this.logger.warn('Kafka is disabled via KAFKA_ENABLED=false');
      return;
    }

    try {
      this.kafka = new Kafka({
        clientId: process.env.KAFKA_CLIENT_ID ?? 'eventhub-api',
        brokers: this.brokers,
      });

      this.producer = this.kafka.producer();
      this.consumer = this.kafka.consumer({ groupId: this.groupId });

      await this.producer.connect();
      await this.consumer.connect();
      await this.consumer.subscribe({
        topic: this.topic,
        fromBeginning: false,
      });

      await this.consumer.run({
        eachMessage: async ({ message }) => {
            console.log('Received Kafka message:', { value: message.value?.toString() });
          const raw = message.value?.toString();
          if (!raw) {
            return;
          }

          let parsed: { eventId?: string } | null = null;
          try {
            parsed = JSON.parse(raw) as { eventId?: string };
          } catch {
            this.logger.warn(`Invalid Kafka payload: ${raw}`);
            return;
          }

          if (!parsed?.eventId) {
            this.logger.warn('Kafka message missing eventId');
            return;
          }

          const eventService = this.moduleRef.get(EventsService, {
            strict: false,
          });
          await eventService.processSingleEvent(parsed.eventId);
        },
      });

      this.active = true;
      this.logger.log(
        `Kafka connected. topic=${this.topic}, groupId=${this.groupId}, brokers=${this.brokers.join(',')}`,
      );
    } catch (error) {
      this.active = false;
      this.logger.error(
        'Kafka startup failed. Falling back to in-process async handler.',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  async enqueueEvent(eventId: string) {
    if (!this.active || !this.producer) {
      return false;
    }

    await this.producer.send({
      topic: this.topic,
      messages: [{ value: JSON.stringify({ eventId }) }],
    });

    return true;
  }

  async onModuleDestroy() {
    await this.consumer?.disconnect();
    await this.producer?.disconnect();
  }
}
