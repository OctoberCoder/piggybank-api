import { FastifyInstance } from 'fastify';
import { authMiddleware } from '../middleware/auth.js';
import * as notificationService from '../services/notification.service.js';

export async function notificationRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', authMiddleware);

  app.get('/', async (request) => {
    const { page, limit } = request.query as { page?: string; limit?: string };
    return notificationService.getNotifications((request as any).userId!, parseInt(page || '1'), parseInt(limit || '20'));
  });

  app.put('/:id/read', async (request) => {
    const { id } = request.params as { id: string };
    await notificationService.markAsRead(id);
    return { message: 'Marked as read' };
  });
}
