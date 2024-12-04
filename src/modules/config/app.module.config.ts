// src/modules/config/app.config.module.ts
import { Module } from '@nestjs/common';
import { AppConfigController } from './app.config.controller';
import { RedisModule } from '../../database/redis.module';

@Module({
  imports: [RedisModule],
  controllers: [AppConfigController],
})
export class AppConfigModule {}
