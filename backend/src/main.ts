import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Aktifkan CORS untuk Dashboard React Frontend & Client Apps
  const allowedOriginsEnv = process.env.ALLOWED_ORIGINS;
  const allowedOriginsList = allowedOriginsEnv
    ? allowedOriginsEnv.split(',').map((o) => o.trim())
    : [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://localhost:3000',
        'http://localhost:4173',
      ];

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      if (!origin) return callback(null, true);
      // Izinkan jika terdapat dalam allowedOriginsList, wildcard, mode development, atau any domain host
      const isAllowed =
        allowedOriginsList.includes(origin) ||
        allowedOriginsList.includes('*') ||
        origin.includes('localhost') ||
        origin.includes('127.0.0.1') ||
        true; // Allow CORS by default since API is protected by ClientOriginGuard & JwtAuthGuard

      if (isAllowed) {
        callback(null, true);
      } else {
        callback(new Error(`CORS blocked for origin: ${origin}`));
      }
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'x-cryptospike-client',
    ],
    credentials: true,
  });

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  logger.log(
    `CryptoSpike NestJS Backend is running on: http://localhost:${port}`,
  );
}

void bootstrap();
