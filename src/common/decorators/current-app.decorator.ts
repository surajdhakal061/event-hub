import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export type ApiKeyAppContext = {
  appId: string;
  appName: string;
  ownerId: string;
};

export const CurrentApp = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): ApiKeyAppContext => {
    const request = ctx.switchToHttp().getRequest();
    return request.appContext as ApiKeyAppContext;
  },
);
