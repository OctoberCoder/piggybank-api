import { FastifyInstance } from 'fastify';
import { authMiddleware } from '../middleware/auth.js';
import * as goalService from '../services/goal.service.js';
import * as walletService from '../services/wallet.service.js';

export async function goalRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', authMiddleware);

  app.get('/:walletId/goals', async (request) => {
    const { walletId } = request.params as { walletId: string };
    return goalService.getGoals(walletId);
  });

  app.post('/:walletId/goals', async (request, reply) => {
    const { walletId } = request.params as { walletId: string };
    const { name, emoji, targetAmount } = request.body as { name: string; emoji: string; targetAmount: number };
    const goal = await goalService.createGoal(walletId, name, emoji, targetAmount);
    return reply.status(201).send(goal);
  });

  app.put('/goals/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { amountChange, expectedVersion } = request.body as { amountChange: number; expectedVersion: number };

    // Get goal to find wallet
    const goal = await goalService.getGoal(id);
    if (!goal) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Goal not found' } });

    try {
      // Transfer funds to/from the goal
      if (amountChange > 0) {
        const wallet = await walletService.getWallet(goal.wallet_id);
        if (!wallet) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Wallet not found' } });
        if (wallet.balance < amountChange) {
          return reply.status(400).send({ error: { code: 'INSUFFICIENT_FUNDS', message: 'Insufficient funds' } });
        }
        await walletService.updateBalance(goal.wallet_id, -amountChange, wallet.version);
      }

      const updated = await goalService.updateGoalProgress(id, amountChange, expectedVersion);
      return updated;
    } catch (err: any) {
      if (err.message === 'VERSION_CONFLICT') {
        return reply.status(409).send({ error: { code: 'VERSION_CONFLICT', message: 'Goal was updated elsewhere' } });
      }
      throw err;
    }
  });

  app.delete('/goals/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const goal = await goalService.getGoal(id);
    if (!goal) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Goal not found' } });
    await goalService.cancelGoal(id, goal.wallet_id);
    return { message: 'Goal cancelled' };
  });
}
