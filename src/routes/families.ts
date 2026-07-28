import { FastifyInstance } from 'fastify';
import { authMiddleware } from '../middleware/auth.js';
import * as familyService from '../services/family.service.js';
import * as invitationService from '../services/invitation.service.js';
import * as childService from '../services/child.service.js';

export async function familyRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', authMiddleware);

  app.post('/', async (request, reply) => {
    const { name, currency } = request.body as { name: string; currency?: string };
    const family = await familyService.createFamily(name, currency || 'NGN', (request as any).userId!);
    return reply.status(201).send(family);
  });

  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const family = await familyService.getFamily(id);
    if (!family) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Family not found' } });
    return family;
  });

  app.get('/:id/parents', async (request) => {
    const { id } = request.params as { id: string };
    return familyService.getFamilyParents(id);
  });

  app.get('/:id/children', async (request) => {
    const { id } = request.params as { id: string };
    return familyService.getFamilyChildren(id);
  });

  app.put('/:id', async (request) => {
    const { id } = request.params as { id: string };
    const updates = request.body as Record<string, unknown>;
    return familyService.updateFamily(id, updates);
  });

  app.post('/:id/parents', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { email } = request.body as { email: string };
    const invitation = await invitationService.createInvitation(id, email, (request as any).userId!);
    return reply.status(201).send(invitation);
  });

  app.post('/parents/accept', async (request) => {
    const { token } = request.body as { token: string };
    await invitationService.acceptInvitation(token, (request as any).userId!);
    return { message: 'Invitation accepted' };
  });

  app.delete('/:id/parents/:userId', async (request) => {
    const { id, userId } = request.params as { id: string; userId: string };
    await invitationService.removeParent(id, userId);
    return { message: 'Parent removed' };
  });

  app.post('/:id/members', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { name } = request.body as { name: string };
    const result = await childService.addChild(id, name);
    return reply.status(201).send(result);
  });

  app.post('/:id/members/:memberId/pin', async (request) => {
    const { memberId } = request.params as { memberId: string };
    const { pin } = request.body as { pin: string };
    await childService.setChildPin(memberId, pin);
    return { message: 'PIN set' };
  });

  app.delete('/:id', async (request) => {
    const { id } = request.params as { id: string };
    await familyService.softDeleteFamily(id);
    return { message: 'Family deleted' };
  });
}
