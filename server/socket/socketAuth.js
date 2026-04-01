import { getToken } from 'next-auth/jwt';
import { logInfo, logWarn, logError } from '../logger.js';

export const registerSocketAuth = (io) => {
  io.use(async (socket, next) => {
    try {
      logInfo('socket_auth_start', {
        socketId: socket.id,
        hasCookieHeader: Boolean(socket.request?.headers?.cookie),
        userAgent: socket.request?.headers?.['user-agent'] ?? null,
        origin: socket.request?.headers?.origin ?? null,
      });

      const token = await getToken({
        req: socket.request,
        secret: process.env.AUTH_SECRET,
        secureCookie: process.env.NODE_ENV === 'production',
      });

      if (!token) {
        logWarn('socket_auth_missing_token', {
          socketId: socket.id,
          hasCookieHeader: Boolean(socket.request?.headers?.cookie),
          origin: socket.request?.headers?.origin ?? null,
        });
        return next(new Error('UNAUTHORIZED'));
      }

      socket.data.user = {
        id: token.sub,
        email: token.email,
        name: token.name,
      };

      logInfo('socket_auth_ok', {
        socketId: socket.id,
        userId: token.sub ?? null,
        email: token.email ?? null,
      });

      return next();
    } catch (err) {
      logError('socket_auth_error', {
        socketId: socket.id,
        error:
          err instanceof Error
            ? { name: err.name, message: err.message, stack: err.stack }
            : { message: String(err) },
      });
      return next(new Error('UNAUTHORIZED'));
    }
  });
};
