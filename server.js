import { createServer } from 'node:http';
import next from 'next';
import { Server } from 'socket.io';
import { registerSocketAuth, registerSocketHandlers } from './server/socket/index.js';

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = 3000;

const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

console.log('SERVER.JS FILE LOADED');

app.prepare().then(() => {
  const httpServer = createServer(handler);
  const io = new Server(httpServer, {
    transports: ['polling', 'websocket'],
  });

  registerSocketAuth(io);
  registerSocketHandlers(io);

  httpServer
    .once('error', (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
    });
});
