import { db } from '../db/client.js';
import { Notification } from '../types/index.js';

export async function createNotification(userId: string, title: string, body: string, data?: Record<string, unknown>): Promise<Notification> {
  const result = await db.query(
    `INSERT INTO notifications (user_id, title, body, data) VALUES ($1, $2, $3, $4) RETURNING *`,
    [userId, title, body, JSON.stringify(data || {})]
  );
  return result.rows[0];
}

export async function getNotifications(userId: string, page: number = 1, limit: number = 20): Promise<{ data: Notification[]; total: number; page: number; limit: number; has_more: boolean }> {
  const offset = (page - 1) * limit;
  const [dataResult, countResult] = await Promise.all([
    db.query(
      `SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    ),
    db.query(`SELECT COUNT(*) FROM notifications WHERE user_id = $1`, [userId]),
  ]);

  return {
    data: dataResult.rows,
    total: parseInt(countResult.rows[0].count),
    page, limit,
    has_more: offset + limit < parseInt(countResult.rows[0].count),
  };
}

export async function markAsRead(notificationId: string): Promise<void> {
  await db.query(`UPDATE notifications SET read = true WHERE id = $1`, [notificationId]);
}
