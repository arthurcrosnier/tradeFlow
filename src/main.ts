// main.ts
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  if (process.env.NODE_ENV === 'development') {
    console.log('Development mode');
    app.useStaticAssets(join(__dirname, '..', '..', 'public'));
  } else {
    app.useStaticAssets(join(process.cwd(), 'dist', 'public'));
  }

  app.enableCors();
  app.use(cookieParser());
  const port = process.env.PORT || 3000;

  console.log(`Starting server on port ${port}`);
  await app.listen(port, '0.0.0.0');
  console.log(`Server is running on ${await app.getUrl()}`);
}
bootstrap();
