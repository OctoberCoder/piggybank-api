import { FastifyInstance } from 'fastify';
import { authMiddleware } from '../middleware/auth.js';
import * as lessonService from '../services/lesson.service.js';

export async function lessonRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', authMiddleware);

  app.get('/:familyId/lessons', async (request, reply) => {
    const { familyId } = request.params as { familyId: string };
    const lessons = await lessonService.getLessons(familyId);
    return lessons;
  });

  app.post('/lessons/:id/complete', async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      await lessonService.completeLesson(id, (request as any).userId!);
      return { message: 'Lesson completed' };
    } catch (err: any) {
      if (err.message === 'PREREQUISITE_NOT_MET') {
        return reply.status(409).send({ error: { code: 'PREREQUISITE_NOT_MET', message: 'Complete prerequisite lesson first' } });
      }
      throw err;
    }
  });
}
