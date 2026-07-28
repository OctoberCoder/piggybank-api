import { FastifyInstance } from 'fastify';
import { authMiddleware } from '../middleware/auth.js';
import * as loanService from '../services/loan.service.js';
import * as walletService from '../services/wallet.service.js';
import * as familyService from '../services/family.service.js';

export async function loanRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', authMiddleware);

  app.get('/:walletId/loans', async (request) => {
    const { walletId } = request.params as { walletId: string };
    return loanService.getLoans(walletId);
  });

  app.post('/:walletId/loans', async (request, reply) => {
    const { walletId } = request.params as { walletId: string };
    const { principal } = request.body as { principal: number };

    const wallet = await walletService.getWallet(walletId);
    if (!wallet) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Wallet not found' } });

    const family = await familyService.getFamily(wallet.family_id);
    const interestRate = family?.annual_interest_rate ?? 0.02;

    const loan = await loanService.createLoan(walletId, (request as any).userId!, principal, interestRate);
    return reply.status(201).send(loan);
  });

  app.post('/loans/:id/approve', async (request) => {
    const { id } = request.params as { id: string };
    const { parentNote } = request.body as { parentNote?: string };
    return loanService.approveLoan(id, (request as any).userId!, parentNote);
  });

  app.post('/loans/:id/deny', async (request) => {
    const { id } = request.params as { id: string };
    const { parentNote } = request.body as { parentNote?: string };
    return loanService.denyLoan(id, parentNote);
  });

  app.post('/loans/:id/pay', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { amount } = request.body as { amount: number };
    try {
      await loanService.makePayment(id, amount, (request as any).userId!);
      return { message: 'Payment made' };
    } catch (err: any) {
      if (err.message === 'INSUFFICIENT_FUNDS') {
        return reply.status(400).send({ error: { code: 'INSUFFICIENT_FUNDS', message: 'Insufficient funds' } });
      }
      throw err;
    }
  });
}
