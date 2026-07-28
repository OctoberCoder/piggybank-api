import { FastifyInstance } from 'fastify';
import { authMiddleware } from '../middleware/auth.js';
import * as insightService from '../services/insight.service.js';

export async function insightRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', authMiddleware);

  app.get('/:walletId/insights/spending', async (request) => {
    const { walletId } = request.params as { walletId: string };
    const { months } = request.query as { months?: string };
    return insightService.getSpendingBreakdown(walletId, parseInt(months || '1'));
  });

  app.get('/families/:familyId/insights/monthly', async (request) => {
    const { familyId } = request.params as { familyId: string };
    return insightService.getMonthlySummary(familyId);
  });
}
