import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({
  namespace: 'sessions',
  cors: { origin: '*' },
})
export class SessionsGateway {
  @WebSocketServer()
  server: Server;

  /** broadcast dto to everyone */
  sendDashboard() {
    this.server.emit('dashboard');
  }
}
