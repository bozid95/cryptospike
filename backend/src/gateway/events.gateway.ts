import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(EventsGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  broadcastSignal(signal: any) {
    if (this.server) {
      this.server.emit('new_signal', signal);
    }
  }

  broadcastTicker(ticker: any) {
    if (this.server) {
      this.server.emit('ticker_update', ticker);
    }
  }

  broadcastSignalUpdate(update: any) {
    if (this.server) {
      this.server.emit('signal_status_update', update);
    }
  }

  broadcastPositionPrice(data: { symbol: string; markPrice: number }) {
    if (this.server) {
      this.server.emit('position_price_update', data);
    }
  }

  @SubscribeMessage('ping')
  handlePing(): string {
    return 'pong';
  }
}
