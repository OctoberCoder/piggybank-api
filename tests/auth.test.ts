import { describe, it, expect } from 'vitest';
import { createTestUser } from './helpers.js';

describe('Auth Service', () => {
  it('should encrypt PIN with bcrypt', async () => {
    const { setPin, verifyPin } = await import('../src/services/auth.service.js');
    const user = await createTestUser();
    await setPin(user.id, '1234');
    const valid = await verifyPin(user.id, '1234');
    expect(valid).toBe(true);
  });

  it('should reject wrong PIN', async () => {
    const { setPin, verifyPin } = await import('../src/services/auth.service.js');
    const user = await createTestUser();
    await setPin(user.id, '1234');
    const valid = await verifyPin(user.id, '0000');
    expect(valid).toBe(false);
  });

  it('should register a new user', async () => {
    const { register } = await import('../src/services/auth.service.js');
    const result = await register('new@example.com', 'password123', 'New User');
    expect(result.user.email).toBe('new@example.com');
    expect(result.token).toBeDefined();
    expect(result.refreshToken).toBeDefined();
  });

  it('should login with correct credentials', async () => {
    const { register, login } = await import('../src/services/auth.service.js');
    await register('login@example.com', 'password123', 'Login User');
    const result = await login('login@example.com', 'password123');
    expect(result.token).toBeDefined();
  });

  it('should reject wrong password', async () => {
    const { register, login } = await import('../src/services/auth.service.js');
    await register('wrong@example.com', 'password123', 'Wrong User');
    await expect(login('wrong@example.com', 'wrongpassword'))
      .rejects.toThrow('Invalid credentials');
  });

  it('should refresh tokens', async () => {
    const { register, refresh } = await import('../src/services/auth.service.js');
    const { refreshToken } = await register('refresh@example.com', 'password123', 'Refresh User');
    const result = await refresh(refreshToken);
    expect(result.token).toBeDefined();
    expect(result.refreshToken).toBeDefined();
    expect(result.refreshToken).not.toBe(refreshToken);
  });
});
