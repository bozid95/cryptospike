import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class ClientOriginGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    // 1. Cek Header Signature Rahasia Frontend CryptoSpike
    const clientKey = request.headers['x-cryptospike-client'];
    const validClientKey =
      process.env.APP_CLIENT_KEY?.trim() || 'cspk-client-app-v1-pub';

    if (clientKey === validClientKey) {
      return true;
    }

    // 2. Cek Origin atau Referer
    const origin = (request.headers['origin'] || request.headers['referer'] || '') as string;
    const allowedOrigins = process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim().toLowerCase())
      : [];

    if (origin) {
      const lowerOrigin = origin.toLowerCase();
      // Allow local development & direct app hosts
      if (
        lowerOrigin.includes('localhost') ||
        lowerOrigin.includes('127.0.0.1') ||
        allowedOrigins.some((allowed) => allowed && lowerOrigin.includes(allowed))
      ) {
        return true;
      }
    }

    // Jika tidak ada header valid dan origin tidak dikenal, tolak akses luar
    throw new ForbiddenException(
      'Access denied: Request must originate from authorized CryptoSpike client application.',
    );
  }
}
