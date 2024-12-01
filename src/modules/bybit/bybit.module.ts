// src/modules/bybit/bybit.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisModule } from '../../database/redis.module';
import { BybitController } from './bybit.controller';
import { BybitService } from './bybit.service';

@Module({
  imports: [ConfigModule, RedisModule],
  controllers: [BybitController],
  providers: [BybitService],
  exports: [BybitService],
})
export class BybitModule {}
