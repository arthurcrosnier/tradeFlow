// src/modules/telegram/telegram.controller.ts
import { Controller, Get } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { SignalResponseDto } from './dto/signal.dto';

@Controller('signals')
export class TelegramController {
  constructor(private readonly telegramService: TelegramService) {}

  @Get('history')
  async getSignals(): Promise<SignalResponseDto[]> {
    return this.telegramService.getStoredSignals();
  }
}
