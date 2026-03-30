import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AppsService } from '../../apps/apps.service';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly appsService: AppsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const rawApiKey =
      (request.headers['x-api-key'] as string | undefined) ?? '';

    if (!rawApiKey) {
      throw new UnauthorizedException('Missing x-api-key header');
    }

    const appContext = await this.appsService.validateApiKey(rawApiKey);
    if (!appContext) {
      throw new UnauthorizedException('Invalid API key');
    }

    request.appContext = appContext;
    return true;
  }
}
