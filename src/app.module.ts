// src/app.module.ts
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TelegramModule } from './modules/telegram/telegram.module';
import { AuthModule } from './auth/auth.module';
import { AuthMiddleware } from './middleware/auth.middleware';
import { AppConfigModule } from './modules/config/app.module.config';
import { BinanceModule } from './modules/binance/binance.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    TelegramModule,
    AuthModule,
    AppConfigModule,
    BinanceModule,
  ],
})
export class AppModule {}
