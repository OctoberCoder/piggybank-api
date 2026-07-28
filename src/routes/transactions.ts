import { FastifyInstance } from 'fastify';
import { authMiddleware } from '../middleware/auth.js';
import * as transactionService from '../services/transaction.service.js';
import * as walletService from '../services/wallet.service.js';

export async function transactionRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', authMiddleware);

  app.get('/:walletId/transactions', async (request) => {
    const { walletId } = request.params as { walletId: string };
    const { page, limit } = request.query as { page?: string; limit?: string };
    return transactionService.getTransactions(walletId, parseInt(page || '1'), parseInt(limit || '20'));
  });

  app.post('/:walletId/transactions', async (request, reply) => {
    const { walletId } = request.params as { walletId: string };
    const { type, amount, description, metadata } = request.body as {
      type: 'deposit' | 'withdrawal';
      amount: number;
      description?: string;
      metadata?: Record<string, unknown>;
    };

    const wallet = await walletService.getWallet(walletId);
    if (!wallet) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Wallet not found' } });

    const tx = await transactionService.createTransaction({
      walletId,
      familyId: wallet.family_id,
      type,
      amount: type === 'deposit' ? amount : -amount,
      description,
      initiatedBy: (request as any).userId!,
      initiatorRole: 'parent',
      metadata,
    });

    try {
      await walletService.updateBalance(walletId, type === 'deposit' ? amount : -amount, wallet.version);
    } catch (err: any) {
      if (err.message === 'VERSION_CONFLICT') {
        return reply.status(409).send({ error: { code: 'VERSION_CONFLICT', message: 'Wallet was updated elsewhere' } });
      }
      throw err;
    }

    return reply.status(201).send(tx);
  });
}
