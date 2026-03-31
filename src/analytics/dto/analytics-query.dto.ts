import { IsOptional, IsUUID } from 'class-validator';

export class AnalyticsQueryDto {
  @IsOptional()
  @IsUUID()
  appId?: string;
}
