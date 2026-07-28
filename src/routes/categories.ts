import { FastifyInstance } from 'fastify';
import { authMiddleware } from '../middleware/auth.js';
import { db } from '../db/client.js';

export async function categoryRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', authMiddleware);

  app.get('/:familyId/categories', async (request) => {
    const { familyId } = request.params as { familyId: string };
    const result = await db.query(
      `SELECT * FROM spending_categories WHERE family_id = $1 ORDER BY is_system DESC, name ASC`,
      [familyId]
    );
    return result.rows;
  });

  app.post('/:familyId/categories', async (request, reply) => {
    const { familyId } = request.params as { familyId: string };
    const { name, emoji } = request.body as { name: string; emoji: string };
    const result = await db.query(
      `INSERT INTO spending_categories (family_id, name, emoji) VALUES ($1, $2, $3) RETURNING *`,
      [familyId, name, emoji]
    );
    return reply.status(201).send(result.rows[0]);
  });

  app.delete('/:familyId/categories/:categoryId', async (request, reply) => {
    const { familyId, categoryId } = request.params as { familyId: string; categoryId: string };
    const result = await db.query(
      `DELETE FROM spending_categories WHERE id = $1 AND family_id = $2 AND is_system = false RETURNING *`,
      [categoryId, familyId]
    );
    if (result.rows.length === 0) {
      return reply.status(400).send({ error: { code: 'CANNOT_DELETE', message: 'System categories cannot be deleted' } });
    }
    return { message: 'Category deleted' };
  });
}
