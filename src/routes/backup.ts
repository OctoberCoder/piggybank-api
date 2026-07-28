import { FastifyInstance } from 'fastify';
import bcrypt from 'bcrypt';
import { authMiddleware } from '../middleware/auth.js';
import * as backupService from '../services/backup.service.js';
import { db } from '../db/client.js';

export async function backupRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', authMiddleware);

  app.get('/:familyId/backup', async (request) => {
    const { familyId } = request.params as { familyId: string };
    return backupService.exportFamilyData(familyId);
  });

  app.post('/:familyId/restore', async (request, reply) => {
    const { familyId } = request.params as { familyId: string };
    const { data, password } = request.body as { data: any; password: string };

    const userResult = await db.query(`SELECT password_hash FROM users WHERE id = $1`, [(request as any).userId!]);
    const user = userResult.rows[0];
    if (!user || !user.password_hash) {
      return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'Re-authentication required' } });
    }
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'Invalid password' } });
    }

    await backupService.restoreFamilyData(familyId, data);
    return { message: 'Family data restored' };
  });
}
