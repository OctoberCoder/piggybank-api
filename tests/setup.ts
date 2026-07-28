import { db } from '../src/db/client.js';

beforeAll(async () => {
  await db.query('SELECT 1');
});

afterAll(async () => {
  await db.end();
});

beforeEach(async () => {
  try {
    await db.query(`
      TRUNCATE users, families, family_parents, family_invitations, wallets,
      transactions, allowance_rules, loans, loan_payments, savings_goals,
      lessons, spending_requests, spending_categories, notifications,
      refresh_tokens, magic_links CASCADE
    `);
  } catch {
    // Tables may not exist in test DB — ignore
  }
});
