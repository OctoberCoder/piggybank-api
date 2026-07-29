import { FastifyInstance } from 'fastify';
import { db } from '../db/client.js';
import { seedFamilyCategories } from '../services/category.service.js';

export async function seedRoutes(app: FastifyInstance): Promise<void> {
  app.post('/seed/demo', async () => {
    const parentResult = await db.query(
      `INSERT INTO users (email, name) VALUES ('parent@demo.com', 'Demo Parent')
       ON CONFLICT (email) DO NOTHING RETURNING id`
    );
    let parentId = parentResult.rows[0]?.id;
    if (!parentId) {
      const existing = await db.query(`SELECT id FROM users WHERE email = 'parent@demo.com'`);
      parentId = existing.rows[0].id;
    }

    const familyResult = await db.query(
      `INSERT INTO families (name, currency, created_by) VALUES ('Demo Family', 'NGN', $1)
       RETURNING id`,
      [parentId]
    );
    const familyId = familyResult.rows[0].id;

    await db.query(
      `INSERT INTO family_parents (family_id, user_id, role) VALUES ($1, $2, 'primary')
       ON CONFLICT DO NOTHING`,
      [familyId, parentId]
    );

    await seedFamilyCategories(familyId);

    const child1 = await db.query(
      `INSERT INTO users (name, is_lightweight) VALUES ('Johnny', true) RETURNING id`
    );
    const child2 = await db.query(
      `INSERT INTO users (name, is_lightweight) VALUES ('Emma', true) RETURNING id`
    );

    const wallet1 = await db.query(
      `INSERT INTO wallets (family_id, user_id, balance) VALUES ($1, $2, 8250) RETURNING id`,
      [familyId, child1.rows[0].id]
    );
    const wallet2 = await db.query(
      `INSERT INTO wallets (family_id, user_id, balance) VALUES ($1, $2, 4500) RETURNING id`,
      [familyId, child2.rows[0].id]
    );

    await db.query(
      `INSERT INTO savings_goals (wallet_id, name, emoji, target_amount, current_amount)
       VALUES ($1, 'New Game', '🎮', 5000, 2500)`,
      [wallet1.rows[0].id]
    );
    await db.query(
      `INSERT INTO savings_goals (wallet_id, name, emoji, target_amount, current_amount)
       VALUES ($1, 'Book Fund', '📚', 3000, 1200)`,
      [wallet1.rows[0].id]
    );

    await db.query(
      `INSERT INTO loans (wallet_id, principal, interest_rate, outstanding, status, requested_by, approved_by, approved_at)
       VALUES ($1, 2000, 0.035, 1500, 'active', $2, $3, NOW())`,
      [wallet1.rows[0].id, child1.rows[0].id, parentId]
    );

    const sysResult = await db.query(
      `SELECT id FROM users WHERE name = 'System' AND is_lightweight = true`
    );
    const sysId = sysResult.rows[0]?.id;

    if (sysId) {
      const catAllowance = await db.query(
        `SELECT id FROM spending_categories WHERE family_id = $1 AND name = 'Allowance'`, [familyId]
      );
      const catWithdrawal = await db.query(
        `SELECT id FROM spending_categories WHERE family_id = $1 AND name = 'Withdrawal'`, [familyId]
      );

      await db.query(
        `INSERT INTO transactions (wallet_id, type, amount, category_id, initiated_by, initiator_role)
         VALUES ($1, 'allowance', 1000, $2, $3, 'system')`,
        [wallet1.rows[0].id, catAllowance.rows[0]?.id, sysId]
      );
      await db.query(
        `INSERT INTO transactions (wallet_id, type, amount, category_id, initiated_by, initiator_role)
         VALUES ($1, 'withdrawal', -500, $2, $3, 'child')`,
        [wallet1.rows[0].id, catWithdrawal.rows[0]?.id, child1.rows[0].id]
      );
    }

    return {
      message: 'Demo data seeded',
      login: { email: 'parent@demo.com', password: 'demo1234' },
      familyId,
      children: [
        { name: 'Johnny', walletId: wallet1.rows[0].id, balance: 8250 },
        { name: 'Emma', walletId: wallet2.rows[0].id, balance: 4500 },
      ]
    };
  });
}
