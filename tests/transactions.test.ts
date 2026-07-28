import { describe, it, expect, beforeAll } from 'vitest';
import { createTestUser, createTestFamily, createTestChild } from './helpers.js';
import { seedFamilyCategories } from '../src/services/category.service.js';
import { db } from '../src/db/client.js';

describe('Transaction Service', () => {
  let familyId: string;
  let walletId: string;
  let systemUserId: string;

  beforeAll(async () => {
    const user = await createTestUser();
    const family = await createTestFamily(user.id);
    familyId = family.id;
    await seedFamilyCategories(familyId);
    const { wallet } = await createTestChild(familyId);
    walletId = wallet.id;

    const result = await db.query(
      `INSERT INTO users (name, is_lightweight) VALUES ('System', true) RETURNING *`
    );
    systemUserId = result.rows[0].id;
  });

  it('should create a deposit transaction with correct category', async () => {
    const { createTransaction } = await import('../src/services/transaction.service.js');
    const tx = await createTransaction({
      walletId,
      familyId,
      type: 'deposit',
      amount: 100,
      description: 'Test deposit',
      initiatedBy: systemUserId,
      initiatorRole: 'system',
    });
    expect(tx.type).toBe('deposit');
    expect(parseFloat(tx.amount)).toBe(100);
    expect(tx.category_id).toBeDefined();
  });

  it('should paginate transaction history', async () => {
    const { getTransactions } = await import('../src/services/transaction.service.js');
    const result = await getTransactions(walletId, 1, 10);
    expect(result.data).toBeDefined();
    expect(typeof result.total).toBe('number');
    expect(result.page).toBe(1);
    expect(result.limit).toBe(10);
  });
});
