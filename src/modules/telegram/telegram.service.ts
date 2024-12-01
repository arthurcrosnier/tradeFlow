// src/modules/telegram/telegram.service.ts
import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
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

  constructor(private configService: ConfigService) {
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
    await this.client.start({
      phoneNumber: async () => await input.text('Numéro de téléphone: '),
      password: async () =>
        await input.text('Mot de passe 2FA (si configuré): '),
      phoneCode: async () => await input.text('Code reçu par SMS: '),
      onError: (err) => console.log(err),
    });

    const session = this.client.session.save() as unknown as string;
    fs.writeFileSync('session.txt', session);
    this.logger.log('Client Telegram connecté');

    try {
      const targetChannel = this.configService.get<string>('TELEGRAM_CHANNEL');
      const channel = await this.client.getEntity(targetChannel);
      await this.client.getMessages(channel, {
        limit: 1,
      });

      this.client.addEventHandler(async (event: any) => {
        if (event.message) {
          const eventIdString = String(event?.message.peerId?.channelId);
          const targetIdString = String(channel.id);

          this.logger.log('Message event:', eventIdString);
          this.logger.log('Message target:', targetIdString);
          this.logger.log(eventIdString === targetIdString);

          if (eventIdString === targetIdString) {
            const message = event.message.message;
            if (message) {
              this.logger.log(
                `Message reçu du channel ${targetChannel}: ${message}`,
              );
              await this.storeMessage({
                id: uuidv4(),
                type: 'LONG',
                symbol: 'UNKNOWN',
                entryPrice: 0,
                stopLoss: 0,
                takeProfit: 0,
                timestamp: new Date(),
                processed: false,
                rawMessage: message,
              });
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

  private async storeMessage(signal: TradingSignal & { rawMessage: string }) {
    this.signals.push(signal);
    this.logger.log(`Message stocké: ${signal.rawMessage}`);
  }

  async getStoredSignals(): Promise<TradingSignal[]> {
    return this.signals;
  }
}
