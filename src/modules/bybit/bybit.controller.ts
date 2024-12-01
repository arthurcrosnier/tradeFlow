// src/modules/bybit/bybit.controller.ts
import { Controller, Get } from '@nestjs/common';
import { BybitService } from './bybit.service';

@Controller('trading')
export class BybitController {
  constructor(private readonly bybitService: BybitService) {}

  @Get('orders/history')
  async getStoredOrderHistory() {
    return this.bybitService.getStoredOrderHistory();
  }
}
