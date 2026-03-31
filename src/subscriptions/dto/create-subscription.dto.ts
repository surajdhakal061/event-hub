import { IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';

export class CreateSubscriptionDto {
  @IsNotEmpty()
  @IsString()
  eventName: string;

  @IsOptional()
  @IsUrl()
  webhookUrl?: string;
}
