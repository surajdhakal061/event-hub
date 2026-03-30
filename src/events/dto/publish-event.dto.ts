import {
  IsEmail,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';

export class PublishEventDto {
  @IsString()
  @IsNotEmpty()
  eventName: string;

  @IsEmail()
  recipient: string;

  @IsObject()
  payload: Record<string, unknown>;

  @IsOptional()
  @IsString()
  templateName?: string;
}
