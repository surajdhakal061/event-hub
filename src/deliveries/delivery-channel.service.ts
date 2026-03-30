import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import nodemailer, { Transporter } from 'nodemailer';

type SendInput = {
  recipient: string;
  subject: string;
  body: string;
  payload: Record<string, unknown>;
};

@Injectable()
export class DeliveryChannelService implements OnModuleInit {
  private readonly logger = new Logger(DeliveryChannelService.name);
  private transporter: Transporter | null = null;

  onModuleInit() {
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = Number(process.env.SMTP_PORT ?? 587);
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (!smtpHost || !smtpUser || !smtpPass) {
      this.logger.warn(
        'SMTP is not fully configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM to enable real email delivery.',
      );
      return;
    }

    this.transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: process.env.SMTP_SECURE === 'true' || smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    this.logger.log(
      `SMTP transporter initialized for host=${smtpHost}:${smtpPort}`,
    );
  }

  async sendEmail(input: SendInput) {
    const forceFail = Boolean(input.payload.forceFail);
    if (forceFail) {
      return {
        success: false,
        errorMessage: 'Forced failure from payload.forceFail',
      };
    }

    if (!this.transporter) {
      return {
        success: false,
        errorMessage: 'SMTP transporter is not configured',
      };
    }

    const from = process.env.SMTP_FROM ?? process.env.SMTP_USER;
    if (!from) {
      return {
        success: false,
        errorMessage: 'SMTP_FROM is not configured',
      };
    }

    try {
      const info = await this.transporter.sendMail({
        from,
        to: input.recipient,
        subject: input.subject,
        text: input.body,
        html: `<p>${input.body.replace(/\n/g, '<br />')}</p>`,
      });

      return {
        success: true,
        providerResponse: `SMTP accepted. messageId=${info.messageId}`,
      };
    } catch (error) {
      return {
        success: false,
        errorMessage:
          error instanceof Error ? error.message : 'SMTP send failed',
      };
    }
  }
}
