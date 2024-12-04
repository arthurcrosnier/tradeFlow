// src/modules/telegram/telegram.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BybitModule } from '../bybit/bybit.module';
import { TelegramController } from './telegram.controller';
import { TelegramService } from './telegram.service';
import { RedisModule } from 'src/database/redis.module';

@Module({
  imports: [ConfigModule, BybitModule, RedisModule],
  controllers: [TelegramController],
  providers: [TelegramService],
  exports: [TelegramService],
})
export class TelegramModule {}
