import { FastifyInstance } from 'fastify';
import { authMiddleware } from '../middleware/auth.js';
import { seedSystemUser } from '../db/seeds/system-user.js';
import * as allowanceService from '../services/allowance.service.js';
import * as walletService from '../services/wallet.service.js';
import { config } from '../config.js';

export async function allowanceRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', authMiddleware);

  app.get('/:walletId/allowance', async (request, reply) => {
    const { walletId } = request.params as { walletId: string };
    const rule = await allowanceService.getRule(walletId);
    if (!rule) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'No allowance rule found' } });
    return rule;
  });

  app.post('/:walletId/allowance', async (request, reply) => {
    const { walletId } = request.params as { walletId: string };
    const data = request.body as any;
    const wallet = await walletService.getWallet(walletId);
    if (!wallet) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Wallet not found' } });
    return allowanceService.createOrUpdateRule(walletId, wallet.family_id, data);
  });

  app.delete('/:walletId/allowance', async (request, reply) => {
    const { walletId } = request.params as { walletId: string };
    const rule = await allowanceService.getRule(walletId);
    if (!rule) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'No allowance rule found' } });
    await allowanceService.deleteRule(rule.id);
    return { message: 'Allowance rule deleted' };
  });
}

export async function allowanceCronRoutes(app: FastifyInstance): Promise<void> {
  const runAllowance = async (request: any, reply: any) => {
    const cronSecret = request.headers['x-cron-secret'];
    if (cronSecret !== config.cron.secret) {
      return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'Invalid cron secret' } });
    }
    const systemUserId = await seedSystemUser();
    const processed = await allowanceService.processPayouts(systemUserId);
    return { processed };
  };

  app.post('/allowance/run', runAllowance);
}
