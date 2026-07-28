import { describe, it, expect } from 'vitest';
import { createTestUser, createTestFamily, createTestChild } from './helpers.js';

describe('Wallet Service', () => {
  it('should create a wallet for a new child', async () => {
    const user = await createTestUser();
    const family = await createTestFamily(user.id);
    const { user: child, wallet } = await createTestChild(family.id, 'Johnny');
    expect(wallet).toBeDefined();
    expect(wallet.balance).toBe('0.00');
    expect(wallet.family_id).toBe(family.id);
  });

  it('should deposit funds and update balance', async () => {
    const { updateBalance } = await import('../src/services/wallet.service.js');
    const user = await createTestUser();
    const family = await createTestFamily(user.id);
    const { wallet } = await createTestChild(family.id);

    const updated = await updateBalance(wallet.id, 100, wallet.version);
    expect(parseFloat(updated.balance)).toBe(100);
    expect(updated.version).toBe(wallet.version + 1);
  });

  it('should reject concurrent balance updates with version conflict', async () => {
    const { updateBalance } = await import('../src/services/wallet.service.js');
    const user = await createTestUser();
    const family = await createTestFamily(user.id);
    const { wallet } = await createTestChild(family.id);

    await updateBalance(wallet.id, 100, wallet.version);
    await expect(updateBalance(wallet.id, 50, wallet.version))
      .rejects.toThrow('VERSION_CONFLICT');
  });
});
