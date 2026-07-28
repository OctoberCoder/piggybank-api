import { FastifyInstance } from 'fastify';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import * as authService from '../services/auth.service.js';

export async function authRoutes(app: FastifyInstance): Promise<void> {
  app.post('/register', async (request, reply) => {
    const { email, password, name } = request.body as { email: string; password: string; name: string };
    const result = await authService.register(email, password, name);
    return reply.status(201).send(result);
  });

  app.post('/login', async (request, reply) => {
    const { email, password } = request.body as { email: string; password: string };
    const result = await authService.login(email, password);
    return result;
  });

  app.post('/refresh', async (request, reply) => {
    const { refreshToken } = request.body as { refreshToken: string };
    const result = await authService.refresh(refreshToken);
    return result;
  });

  app.post('/magic-link', async (request, reply) => {
    const { email } = request.body as { email: string };
    const token = await authService.createMagicLink(email);
    return { message: 'Magic link sent', token };
  });

  app.post('/magic-link/verify', async (request, reply) => {
    const { token } = request.body as { token: string };
    const result = await authService.verifyMagicLink(token);
    if (!result) {
      return reply.status(400).send({ error: { code: 'INVALID_TOKEN', message: 'Invalid or expired magic link' } });
    }
    return result;
  });

  app.post('/pin/verify', async (request, reply) => {
    const { userId, pin } = request.body as { userId: string; pin: string };
    const valid = await authService.verifyPin(userId, pin);
    if (!valid) {
      return reply.status(401).send({ error: { code: 'INVALID_PIN', message: 'Invalid PIN' } });
    }
    const token = jwt.sign({ sub: userId, type: 'pin-session' }, config.jwt.secret, { expiresIn: '15m' });
    return { token };
  });
}
