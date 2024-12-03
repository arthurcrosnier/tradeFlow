// src/modules/telegram/telegram.service.ts
import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { BybitService } from '../bybit/bybit.service';
import { ConfigService } from '@nestjs/config';
import { TradingSignal } from './interfaces/signal.interface';
import { v4 as uuidv4 } from 'uuid';
import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import input from 'input';
import * as fs from 'fs';

@Injectable()
export class TelegramService implements OnModuleInit {
  private client: TelegramClient;
  private loginPhoneNumber: string | null = null;
  private waitingForCode = false;
  private readonly logger = new Logger(TelegramService.name);
  private signals: TradingSignal[] = [];
  private readonly SESSION_FILE = 'session.txt';

  constructor(
    private configService: ConfigService,
    private bybitService: BybitService,
  ) {
    const apiId = Number(this.configService.get<string>('TELEGRAM_API_ID'));
    const apiHash = this.configService.get<string>('TELEGRAM_API_HASH');

    this.client = new TelegramClient(new StringSession(''), apiId, apiHash, {
      connectionRetries: 5,
      deviceModel: 'Server',
      systemVersion: 'NodeJS',
      appVersion: '1.0.0',
    });
  }

  async onModuleInit() {
    this.logger.log(
      'Service Telegram initialisé, utilisez /telegram/login pour vous connecter',
    );
  }

  async getConnectionStatus() {
    return {
      connected: this.client?.connected || false,
      waitingForCode: this.waitingForCode,
      loginPhoneNumber: this.loginPhoneNumber,
    };
  }

  async initiateLogin(phoneNumber: string) {
    try {
      this.loginPhoneNumber = phoneNumber;
      this.waitingForCode = true;

      await this.client.connect();
      await this.client.sendCode(
        {
          apiId: Number(this.configService.get<string>('TELEGRAM_API_ID')),
          apiHash: this.configService.get<string>('TELEGRAM_API_HASH'),
        },
        phoneNumber,
      );

      return {
        status: 'waiting_for_code',
        phoneNumber: this.loginPhoneNumber,
      };
    } catch (error) {
      this.logger.error('Erreur initiation login:', error);
      this.waitingForCode = false;
      this.loginPhoneNumber = null;
      throw error;
    }
  }

  async verifyCode(code: string) {
    if (!this.waitingForCode) {
      throw new Error('Aucune demande de code en attente');
    }

    try {
      await this.client.start({
        phoneNumber: async () => this.loginPhoneNumber,
        phoneCode: async () => code,
        password: async () => '',
        onError: (err) => {
          this.logger.error('Erreur connexion:', err);
          throw err;
        },
      });

      this.waitingForCode = false;
      this.loginPhoneNumber = null;

      // Une fois connecté, configurer le handler de messages
      await this.setupMessageHandler();

      return {
        status: 'connected',
      };
    } catch (error) {
      this.logger.error('Erreur vérification code:', error);
      throw error;
    }
  }

  private async setupMessageHandler() {
    if (!this.client?.connected) {
      throw new Error('Client non connecté');
    }

    const isTest =
      this.configService.get<string>('IS_TELEGRAM_TEST') === 'true';
    const targetChannel = isTest
      ? this.configService.get<string>('TELEGRAM_CHANNEL_TEST')
      : this.configService.get<string>('TELEGRAM_CHANNEL');
    const channel = await this.client.getEntity(targetChannel);

    this.client.addEventHandler(async (event: any) => {
      if (event.message) {
        const eventIdString = String(event?.message.peerId?.channelId);
        const targetIdString = String(channel.id);

        if (eventIdString === targetIdString) {
          const message = event.message.message;
          if (message) {
            this.logger.log(`Nouveau message reçu: ${message}`);
            const isBuySignal = message.includes('⚡💰 BOUGHT');
            const isSellSignal = message.includes('⚡💰 SOLD');
            if (isBuySignal || isSellSignal) {
              this.logger.log(`Signal de trading détecté: ${message}`);
              await this.handleTradingSignal(message, isBuySignal);
            }
          }
        }
      }
    });

    this.logger.log(
      `Handler de messages configuré pour le channel ${targetChannel}`,
    );
  }

  private async handleTradingSignal(message: string, isBuySignal: boolean) {
    try {
      await this.bybitService.closeAllPositions();
      const currentPrice = await this.bybitService.getBTCPrice();
      const stopLoss = isBuySignal
        ? currentPrice * 0.98 // -2% for long
        : currentPrice * 1.02; // +2% for short
      const takeProfit = isBuySignal
        ? currentPrice * 1.04 // +4% for long
        : currentPrice * 0.96; // -4% for short
      this.logger.log(
        `Ouverture de position: ${isBuySignal ? 'LONG' : 'SHORT'}`,
      );

      await this.bybitService.openPosition({
        type: isBuySignal ? 'LONG' : 'SHORT',
        symbol: 'BTCUSDT',
        entryPrice: currentPrice,
        stopLoss,
        takeProfit,
        portfolioPercentage: 20,
        leverage: 1,
      });

      await this.storeMessage({
        id: uuidv4(),
        type: isBuySignal ? 'LONG' : 'SHORT',
        symbol: 'BTCUSDT',
        entryPrice: currentPrice,
        stopLoss,
        takeProfit,
        timestamp: new Date(),
        processed: true,
        rawMessage: message,
      });
    } catch (error) {
      this.logger.error('Erreur dans handleTradingSignal:', error);
    }
  }

  private async storeMessage(signal: TradingSignal & { rawMessage: string }) {
    this.signals.push(signal);
    this.logger.log(`Message stocké: ${signal.rawMessage}`);
  }

  async getStoredSignals(): Promise<TradingSignal[]> {
    return this.signals;
  }
}
