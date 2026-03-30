import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getInfo() {
    return {
      name: 'EventHub',
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
