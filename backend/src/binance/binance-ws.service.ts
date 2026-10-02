import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import WebSocket from 'ws';
import { Subject } from 'rxjs';

export interface BinanceWsTicker {
  s: string; // Symbol
  c: string; // Close / Last Price
  h: string; // High Price
  l: string; // Low Price
  v: string; // Total traded base asset volume
  q: string; // Total traded quote asset volume
  P: string; // Price change percent
}

@Injectable()
export class BinanceWsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BinanceWsService.name);
  private ws: WebSocket | null = null;
  private isDestroyed = false;
  public readonly ticker$ = new Subject<BinanceWsTicker>();

  onModuleInit() {
    this.connect();
  }

  onModuleDestroy() {
    this.isDestroyed = true;
    if (this.ws) {
      this.ws.terminate();
    }
  }

  private connect() {
    if (this.isDestroyed) return;

    // Stream all ticker mini/full dari Binance Futures
    const url = 'wss://fstream.binance.com/ws/!ticker@arr';
    this.logger.log(`Connecting to Binance Futures WS: ${url}`);

    this.ws = new WebSocket(url);

    this.ws.on('open', () => {
      this.logger.log('Connected to Binance Futures WebSocket stream.');
    });

    this.ws.on('message', (data: WebSocket.RawData) => {
      try {
        let text = '';
        if (typeof data === 'string') {
          text = data;
        } else if (Buffer.isBuffer(data)) {
          text = data.toString('utf-8');
        } else if (Array.isArray(data)) {
          text = Buffer.concat(data).toString('utf-8');
        } else {
          text = Buffer.from(data).toString('utf-8');
        }
        const parsed: unknown = JSON.parse(text);
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            const t = item as Partial<BinanceWsTicker>;
            if (
              t.s &&
              typeof t.s === 'string' &&
              t.s.endsWith('USDT') &&
              t.c &&
              t.P
            ) {
              this.ticker$.next(t as BinanceWsTicker);
            }
          }
        }
      } catch {
        // ignore parse error
      }
    });

    this.ws.on('error', (err: Error) => {
      this.logger.error(`Binance WS error: ${err.message}`);
    });

    this.ws.on('close', () => {
      if (!this.isDestroyed) {
        this.logger.warn('Binance WS closed. Reconnecting in 5s...');
        setTimeout(() => this.connect(), 5000);
      }
    });
  }
}
