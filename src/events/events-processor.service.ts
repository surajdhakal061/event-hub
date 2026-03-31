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

  private readonly retryAttempts = Number(
    process.env.KAFKA_CONSUMER_RETRY_ATTEMPTS ?? 3,
  );
  private readonly retryBaseDelayMs = Number(
    process.env.KAFKA_CONSUMER_RETRY_BASE_DELAY_MS ?? 500,
  );
  private readonly retryMaxDelayMs = Number(
    process.env.KAFKA_CONSUMER_RETRY_MAX_DELAY_MS ?? 5000,
  );

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

          const eventId = parsed.eventId;

          const eventService = this.moduleRef.get(EventsService, {
            strict: false,
          });

          await this.processWithRetry(() => eventService.processSingleEvent(eventId), {
            eventId,
          });
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

  private async processWithRetry(
    fn: () => Promise<void>,
    context: { eventId: string },
  ) {
    const attempts =
      Number.isFinite(this.retryAttempts) && this.retryAttempts > 0
        ? Math.floor(this.retryAttempts)
        : 1;

    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        await fn();
        return;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);

        if (attempt >= attempts) {
          this.logger.error(
            `Kafka handler failed after ${attempt} attempt(s). eventId=${context.eventId}. error=${message}`,
            error instanceof Error ? error.stack : undefined,
          );
          // Swallow the error so the consumer stays alive and the offset can be committed.
          return;
        }

        const delayMs = this.getRetryDelayMs(attempt);
        this.logger.warn(
          `Kafka handler failed (attempt ${attempt}/${attempts}). Retrying in ${delayMs}ms. eventId=${context.eventId}. error=${message}`,
        );
        await this.sleep(delayMs);
      }
    }
  }

  private getRetryDelayMs(attempt: number) {
    const base =
      Number.isFinite(this.retryBaseDelayMs) && this.retryBaseDelayMs >= 0
        ? this.retryBaseDelayMs
        : 0;
    const max =
      Number.isFinite(this.retryMaxDelayMs) && this.retryMaxDelayMs >= 0
        ? this.retryMaxDelayMs
        : base;

    const exp = base * Math.pow(2, Math.max(0, attempt - 1));
    const unclamped = Math.min(exp, max);
    const jitter = unclamped * 0.2 * Math.random();
    return Math.max(0, Math.floor(unclamped + jitter));
  }

  private sleep(ms: number) {
    return new Promise<void>((resolve) => setTimeout(resolve, ms));
  }
}
