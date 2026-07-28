import crypto from 'crypto';
import { db } from '../db/client.js';
import { FamilyInvitation } from '../types/index.js';

export async function createInvitation(familyId: string, email: string, invitedBy: string): Promise<FamilyInvitation> {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const result = await db.query(
    `INSERT INTO family_invitations (family_id, email, token, invited_by, expires_at)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [familyId, email, token, invitedBy, expiresAt]
  );
  return result.rows[0];
}

export async function acceptInvitation(token: string, userId: string): Promise<void> {
  const result = await db.query(
    `SELECT * FROM family_invitations WHERE token = $1 AND expires_at > NOW() AND accepted_at IS NULL`,
    [token]
  );

  if (result.rows.length === 0) {
    throw new Error('Invalid or expired invitation');
  }

  const invitation = result.rows[0];

  await db.query(
    `INSERT INTO family_parents (family_id, user_id, role) VALUES ($1, $2, 'secondary')`,
    [invitation.family_id, userId]
  );

  await db.query(
    `UPDATE family_invitations SET accepted_at = NOW() WHERE id = $1`,
    [invitation.id]
  );
}

export async function removeParent(familyId: string, userId: string): Promise<void> {
  await db.query(
    `DELETE FROM family_parents WHERE family_id = $1 AND user_id = $2 AND role != 'primary'`,
    [familyId, userId]
  );
}
