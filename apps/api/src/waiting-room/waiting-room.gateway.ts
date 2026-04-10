import {
  OnGatewayConnection,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";

@WebSocketGateway({
  namespace: "/waiting-room",
  cors: {
    origin: process.env.WEB_ORIGIN?.split(",") ?? ["http://localhost:5173"],
    credentials: true
  }
})
export class WaitingRoomGateway implements OnGatewayInit, OnGatewayConnection {
  @WebSocketServer()
  server!: Server;

  afterInit(): void {
    // Socket.IO server initialized
  }

  handleConnection(client: Socket): void {
    const tenantId = client.handshake.auth?.tenantId;
    if (tenantId) {
      client.join(`tenant:${tenantId}`);
    }
  }

  @SubscribeMessage("waiting-room:join")
  handleJoin(client: Socket, payload: { tenantId: string }): void {
    client.join(`tenant:${payload.tenantId}`);
  }

  publishQueue(tenantId: string, data: unknown): void {
    this.server.to(`tenant:${tenantId}`).emit("waiting-room:updated", data);
  }

  publishNotification(tenantId: string, data: unknown): void {
    this.server.to(`tenant:${tenantId}`).emit("notifications:new", data);
  }
}
