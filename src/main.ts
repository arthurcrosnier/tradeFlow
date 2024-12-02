// main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  const port = process.env.PORT || 3000;

  console.log(`Starting server on port ${port}`);
  await app.listen(port, '0.0.0.0');
  console.log(`Server is running on ${await app.getUrl()}`);
}
bootstrap();
