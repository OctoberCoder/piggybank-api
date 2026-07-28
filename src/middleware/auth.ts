import { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';

export async function authMiddleware(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const authHeader = request.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'Missing token' } });
  }

  try {
    const token = authHeader.slice(7);
    const payload = jwt.verify(token, config.jwt.secret) as { sub: string };
    (request as any).userId = payload.sub;
  } catch {
    return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'Invalid token' } });
  }
}
