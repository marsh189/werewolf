import { Server } from 'socket.io';
import { NextResponse } from 'next/server';

let io: Server | null = null;

export async function GET() {
  if (!io) {
    console.log('🟢 Initializing Socket.IO server');

    io = new Server({
      path: '/api/socket',
      cors: {
        origin: '*',
      },
    });

    io.on('connection', (socket) => {
      console.log('🧠 Player connected:', socket.id);

      socket.on('join-room', (roomId: string) => {
        socket.join(roomId);
        console.log(`Player ${socket.id} joined room ${roomId}`);

        io?.to(roomId).emit('player-joined', socket.id);
      });

      socket.on('disconnect', () => {
        console.log('🔴 Player disconnected:', socket.id);
      });
    });
  }

  return NextResponse.json({ ok: true });
}
