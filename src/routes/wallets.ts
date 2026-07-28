import { FastifyInstance } from 'fastify';
import { authMiddleware } from '../middleware/auth.js';
import * as walletService from '../services/wallet.service.js';

export async function walletRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', authMiddleware);

  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const wallet = await walletService.getWallet(id);
    if (!wallet) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Wallet not found' } });
    return wallet;
  });
}
