// src/modules/telegram/telegram.controller.ts
import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { SignalResponseDto } from './dto/signal.dto';
import { AuthGuard } from '../../auth/auth.guard';

@Controller('signals')
@UseGuards(AuthGuard)
export class TelegramController {
  constructor(private readonly telegramService: TelegramService) {}

  @Get('history')
  async getSignals(): Promise<SignalResponseDto[]> {
    return this.telegramService.getStoredSignals();
  }

  @Get('status')
  async getConnectionStatus() {
    return await this.telegramService.getConnectionStatus();
  }

  @Post('login')
  async initiateLogin(@Body() body: { phoneNumber: string }) {
    return await this.telegramService.initiateLogin(body.phoneNumber);
  }

  @Post('verify')
  async verifyCode(@Body() body: { code: string }) {
    return await this.telegramService.verifyCode(body.code);
  }
}
