// src/modules/binance/binance.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BinanceService } from './binance.service';
import { BinanceController } from './binance.controller';

@Module({
  imports: [ConfigModule],
  controllers: [BinanceController],
  providers: [BinanceService],
  exports: [BinanceService],
})
export class BinanceModule {}
