// src/app.module.ts
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TelegramModule } from './modules/telegram/telegram.module';
import { AuthModule } from './auth/auth.module';
import { AuthMiddleware } from './middleware/auth.middleware';
import { AppConfigModule } from './modules/config/app.module.config';

@Module({
  imports: [
    ConfigModule.forRoot(),
    TelegramModule,
    AuthModule,
    AppConfigModule,
  ],
})
export class AppModule {}
// export class AppModule implements NestModule {
//   configure(consumer: MiddlewareConsumer) {
//     consumer
//       .apply(AuthMiddleware)
//       .exclude('/auth/login', '/auth.html', '/login_telegram.html')
//       .forRoutes('signals');
//   }
// }
