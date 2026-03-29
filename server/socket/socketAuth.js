import { getToken } from 'next-auth/jwt';

export const registerSocketAuth = (io) => {
  io.use(async (socket, next) => {
    try {
      const token = await getToken({
        req: socket.request,
        secret: process.env.AUTH_SECRET,
      });

      if (!token) return next(new Error('UNAUTHORIZED'));

      socket.data.user = {
        id: token.sub,
        email: token.email,
        name: token.name,
      };

      return next();
    } catch (err) {
      console.error('Socket auth error:', err);
      return next(new Error('UNAUTHORIZED'));
    }
  });
};
