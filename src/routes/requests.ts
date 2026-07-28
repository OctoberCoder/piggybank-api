import { FastifyInstance } from 'fastify';
import { authMiddleware } from '../middleware/auth.js';
import * as requestService from '../services/request.service.js';

export async function requestRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', authMiddleware);

  app.post('/:walletId/requests', async (request, reply) => {
    const { walletId } = request.params as { walletId: string };
    const { description, amount, categoryId } = request.body as {
      description: string; amount: number; categoryId: string;
    };
    const result = await requestService.submitRequest(
      walletId, (request as any).userId!, description, amount, categoryId
    );
    return reply.status(201).send(result);
  });

  app.get('/families/:familyId/requests', async (request) => {
    const { familyId } = request.params as { familyId: string };
    return requestService.getPendingRequests(familyId);
  });

  app.put('/requests/:id/approve', async (request) => {
    const { id } = request.params as { id: string };
    const { parentNote } = request.body as { parentNote?: string };
    await requestService.approveRequest(id, (request as any).userId!, parentNote);
    return { message: 'Request approved' };
  });

  app.put('/requests/:id/deny', async (request) => {
    const { id } = request.params as { id: string };
    const { parentNote } = request.body as { parentNote?: string };
    await requestService.denyRequest(id, (request as any).userId!, parentNote);
    return { message: 'Request denied' };
  });
}
