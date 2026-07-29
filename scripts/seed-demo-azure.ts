import { db } from './db/client.js';
import { seedFamilyCategories } from './services/category.service.js';

async function seedDemoData() {
  // Create demo parent
  const parentResult = await db.query(
    `INSERT INTO users (email, name) VALUES ('parent@demo.com', 'Demo Parent')
     ON CONFLICT (email) DO NOTHING RETURNING id`
  );
  let parentId = parentResult.rows[0]?.id;
  if (!parentId) {
    const existing = await db.query(`SELECT id FROM users WHERE email = 'parent@demo.com'`);
    parentId = existing.rows[0].id;
  }

  // Create demo family
  const familyResult = await db.query(
    `INSERT INTO families (name, currency, created_by) VALUES ('Demo Family', 'NGN', $1)
     ON CONFLICT DO NOTHING RETURNING id`,
    [parentId]
  );
  let familyId = familyResult.rows[0]?.id;
  if (!familyId) {
    const existing = await db.query(`SELECT id FROM families WHERE name = 'Demo Family'`);
    familyId = existing.rows[0].id;
  }

  // Add parent to family
  await db.query(
    `INSERT INTO family_parents (family_id, user_id, role) VALUES ($1, $2, 'primary')
     ON CONFLICT DO NOTHING`,
    [familyId, parentId]
  );

  // Seed categories
  await seedFamilyCategories(familyId);

  // Create demo children
  const child1 = await db.query(
    `INSERT INTO users (name, is_lightweight) VALUES ('Johnny', true) RETURNING id`
  );
  const child2 = await db.query(
    `INSERT INTO users (name, is_lightweight) VALUES ('Emma', true) RETURNING id`
  );

  // Create wallets
  const wallet1 = await db.query(
    `INSERT INTO wallets (family_id, user_id, balance) VALUES ($1, $2, 8250) RETURNING id`,
    [familyId, child1.rows[0].id]
  );
  const wallet2 = await db.query(
    `INSERT INTO wallets (family_id, user_id, balance) VALUES ($1, $2, 4500) RETURNING id`,
    [familyId, child2.rows[0].id]
  );

  // Create savings goals for Johnny
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

  // Create a loan for Johnny
  await db.query(
    `INSERT INTO loans (wallet_id, principal, interest_rate, outstanding, status, requested_by, approved_by, approved_at)
     VALUES ($1, 2000, 0.035, 1500, 'active', $2, $3, NOW())`,
    [wallet1.rows[0].id, child1.rows[0].id, parentId]
  );

  // Create demo transactions
  const sysUserId = await db.query(
    `SELECT id FROM users WHERE name = 'System' AND is_lightweight = true`
  );
  const sysId = sysUserId.rows[0]?.id;

  if (sysId) {
    const catDeposit = await db.query(
      `SELECT id FROM spending_categories WHERE family_id = $1 AND name = 'Deposit'`, [familyId]
    );
    const catAllowance = await db.query(
      `SELECT id FROM spending_categories WHERE family_id = $1 AND name = 'Allowance'`, [familyId]
    );
    const catWithdrawal = await db.query(
      `SELECT id FROM spending_categories WHERE family_id = $1 AND name = 'Withdrawal'`, [familyId]
    );

    // Some transactions
    if (catDeposit.rows[0]) {
      await db.query(
        `INSERT INTO transactions (wallet_id, type, amount, category_id, initiated_by, initiator_role)
         VALUES ($1, 'allowance', 1000, $2, $3, 'system')`,
        [wallet1.rows[0].id, catAllowance.rows[0]?.id || catDeposit.rows[0].id, sysId]
      );
      await db.query(
        `INSERT INTO transactions (wallet_id, type, amount, category_id, initiated_by, initiator_role)
         VALUES ($1, 'withdrawal', -500, $2, $3, 'child')`,
        [wallet1.rows[0].id, catWithdrawal.rows[0]?.id || catDeposit.rows[0].id, child1.rows[0].id]
      );
    }
  }

  console.log(JSON.stringify({
    message: 'Demo data seeded',
    parentId, familyId,
    children: [
      { name: 'Johnny', walletId: wallet1.rows[0].id, balance: 8250 },
      { name: 'Emma', walletId: wallet2.rows[0].id, balance: 4500 },
    ]
  }));
}

seedDemoData().catch(err => {
  console.error(JSON.stringify({ error: err.message }));
  process.exit(1);
});
