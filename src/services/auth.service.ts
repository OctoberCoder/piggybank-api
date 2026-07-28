import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { db } from '../db/client.js';
import { config } from '../config.js';
import { User } from '../types/index.js';

const BCRYPT_COST = 12;

export async function register(email: string, password: string, name: string): Promise<{ user: User; token: string; refreshToken: string }> {
  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);

  const result = await db.query(
    `INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING *`,
    [email, passwordHash, name]
  );
  const user = result.rows[0];

  const token = generateAccessToken(user.id);
  const refreshToken = await generateRefreshToken(user.id);

  return { user, token, refreshToken };
}

export async function login(email: string, password: string): Promise<{ user: User; token: string; refreshToken: string }> {
  const result = await db.query(`SELECT * FROM users WHERE email = $1`, [email]);
  const user = result.rows[0];

  if (!user || !user.password_hash) {
    throw new Error('Invalid credentials');
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    throw new Error('Invalid credentials');
  }

  const token = generateAccessToken(user.id);
  const refreshToken = await generateRefreshToken(user.id);

  return { user, token, refreshToken };
}

export async function refresh(refreshToken: string): Promise<{ token: string; refreshToken: string }> {
  const result = await db.query(
    `SELECT user_id FROM refresh_tokens WHERE token = $1 AND expires_at > NOW()`,
    [refreshToken]
  );

  if (result.rows.length === 0) {
    throw new Error('Invalid refresh token');
  }

  const userId = result.rows[0].user_id;

  await db.query(`DELETE FROM refresh_tokens WHERE token = $1`, [refreshToken]);

  const token = generateAccessToken(userId);
  const newRefreshToken = await generateRefreshToken(userId);

  return { token, refreshToken: newRefreshToken };
}

export async function verifyPin(userId: string, pin: string): Promise<boolean> {
  const result = await db.query(`SELECT pin_hash FROM users WHERE id = $1`, [userId]);
  const user = result.rows[0];

  if (!user || !user.pin_hash) return false;

  return bcrypt.compare(pin, user.pin_hash);
}

export async function setPin(userId: string, pin: string): Promise<void> {
  const hash = await bcrypt.hash(pin, BCRYPT_COST);
  await db.query(`UPDATE users SET pin_hash = $1 WHERE id = $2`, [hash, userId]);
}

export async function createMagicLink(email: string): Promise<string> {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  await db.query(
    `INSERT INTO magic_links (email, token, expires_at) VALUES ($1, $2, $3)`,
    [email, token, expiresAt]
  );

  return token;
}

export async function verifyMagicLink(token: string): Promise<{ user: User; token: string; refreshToken: string } | null> {
  const result = await db.query(
    `SELECT email FROM magic_links WHERE token = $1 AND expires_at > NOW() AND used = false`,
    [token]
  );

  if (result.rows.length === 0) return null;

  const email = result.rows[0].email;

  await db.query(`UPDATE magic_links SET used = true WHERE token = $1`, [token]);

  let userResult = await db.query(`SELECT * FROM users WHERE email = $1`, [email]);
  let user = userResult.rows[0];

  if (!user) {
    userResult = await db.query(
      `INSERT INTO users (email, name) VALUES ($1, $1) RETURNING *`,
      [email]
    );
    user = userResult.rows[0];
  }

  const accessToken = generateAccessToken(user.id);
  const refreshToken = await generateRefreshToken(user.id);

  return { user, token: accessToken, refreshToken };
}

function generateAccessToken(userId: string): string {
  return jwt.sign({ sub: userId }, config.jwt.secret, { expiresIn: config.jwt.expiry as jwt.SignOptions['expiresIn'] });
}

async function generateRefreshToken(userId: string): Promise<string> {
  const token = crypto.randomBytes(40).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await db.query(
    `INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)`,
    [userId, token, expiresAt]
  );

  return token;
}
