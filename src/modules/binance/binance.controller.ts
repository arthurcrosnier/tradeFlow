// src/modules/binance/binance.controller.ts
import {
  Controller,
  Get,
  Param,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { BinanceService } from './binance.service';
import { TimeInterval } from './binance.types';

@Controller('binance')
export class BinanceController {
  private readonly logger = new Logger(BinanceController.name);

  constructor(private readonly binanceService: BinanceService) {}

  @Get('historical/:interval')
  async getHistoricalData(@Param('interval') interval: TimeInterval) {
    try {
      this.logger.log(`Fetching historical data for interval: ${interval}`);
      return await this.binanceService.fetchHistoricalData(interval);
    } catch (error) {
      this.logger.error(`Error in getHistoricalData: ${error.message}`);
      throw new HttpException(
        error.message || 'Failed to fetch historical data',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('historical/all')
  async getAllTimeframes() {
    try {
      this.logger.log('Fetching historical data for all timeframes');
      return await this.binanceService.fetchAllTimeframes();
    } catch (error) {
      this.logger.error(`Error in getAllTimeframes: ${error.message}`);
      throw new HttpException(
        error.message || 'Failed to fetch all timeframes',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
