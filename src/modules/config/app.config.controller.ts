// src/modules/config/app.config.controller.ts
import { Controller, Get, Put, Body } from '@nestjs/common';
import { RedisService } from '../../database/redis.service';

@Controller('config')
export class AppConfigController {
  constructor(private redisService: RedisService) {}

  @Get()
  async getConfig() {
    return await this.redisService.getConfig();
  }

  @Put()
  async updateConfig(@Body() newConfig: any) {
    await this.redisService.updateConfig(newConfig);
    return { message: 'Configuration mise à jour avec succès' };
  }
}
