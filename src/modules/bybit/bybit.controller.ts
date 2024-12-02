// src/modules/bybit/bybit.controller.ts
import { Controller, Get } from '@nestjs/common';
import { BybitService } from './bybit.service';

@Controller('trading')
export class BybitController {
  constructor(private readonly bybitService: BybitService) {}

  @Get('orders/history')
  async getStoredOrderHistory() {
    console.log('Received request for orders history');
    try {
      const result = await this.bybitService.getStoredOrderHistory();
      console.log('Sending response:', result);
      return result;
    } catch (error) {
      console.error('Error in getStoredOrderHistory:', error);
      throw error;
    }
  }
}
