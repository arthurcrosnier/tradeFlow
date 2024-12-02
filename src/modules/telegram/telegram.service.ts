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
  private readonly logger = new Logger(TelegramService.name);
  private signals: TradingSignal[] = [];

  constructor(
    private configService: ConfigService,
    private bybitService: BybitService,
  ) {
    const apiId = Number(this.configService.get<string>('TELEGRAM_API_ID'));
    const apiHash = this.configService.get<string>('TELEGRAM_API_HASH');
    let session = '';
    try {
      session = fs.readFileSync('session.txt', 'utf8');
    } catch (error) {
      this.logger.log(
        "Pas de session existante, création d'une nouvelle session",
      );
    }

    const stringSession = new StringSession(session);

    this.client = new TelegramClient(stringSession, apiId, apiHash, {
      connectionRetries: 5,
    });
  }

  async onModuleInit() {
    if (process.env.NODE_ENV === 'production') {
      await this.client.connect();
    } else {
      await this.client.start({
        phoneNumber: async () => await input.text('Numéro de téléphone: '),
        password: async () =>
          await input.text('Mot de passe 2FA (si configuré): '),
        phoneCode: async () => await input.text('Code reçu par SMS: '),
        onError: (err) => console.log(err),
      });
    }

    const session = this.client.session.save() as unknown as string;
    fs.writeFileSync('session.txt', session);
    this.logger.log('Client Telegram connecté');

    try {
      const targetChannel = this.configService.get<string>('TELEGRAM_CHANNEL');
      // const targetChannel = this.configService.get<string>(
      //   'TELEGRAM_CHANNEL_TEST',
      // );
      const channel = await this.client.getEntity(targetChannel);
      await this.client.getMessages(channel, {
        limit: 1,
      });

      this.client.addEventHandler(async (event: any) => {
        if (event.message) {
          const eventIdString = String(event?.message.peerId?.channelId);
          const targetIdString = String(channel.id);

          if (eventIdString === targetIdString) {
            const message = event.message.message;
            if (message) {
              this.logger.log(`Nouveau message reçu: ${event.message.message}`);
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
        `Connecté au channel ${targetChannel} et à l'écoute des messages`,
      );
    } catch (error) {
      this.logger.error('Erreur de connexion au channel:', error);
    }
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
