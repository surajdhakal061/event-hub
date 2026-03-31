import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class CreateSubscriptionDto {
  @IsNotEmpty()
  @IsString()
  eventName: string;

  @IsEmail()
  recipientEmail: string;
}
