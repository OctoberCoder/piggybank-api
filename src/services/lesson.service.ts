import { db } from '../db/client.js';
import { Lesson } from '../types/index.js';

export async function getLessons(familyId: string): Promise<Lesson[]> {
  const result = await db.query(
    `SELECT * FROM lessons WHERE family_id = $1 ORDER BY sort_order ASC`,
    [familyId]
  );
  return result.rows;
}

export async function completeLesson(lessonId: string, userId: string): Promise<void> {
  const lesson = await db.query(`SELECT * FROM lessons WHERE id = $1`, [lessonId]);
  if (lesson.rows.length === 0) throw new Error('Lesson not found');

  // Check prerequisite
  if (lesson.rows[0].prerequisite_id) {
    const prereq = await db.query(
      `SELECT shown FROM lessons WHERE id = $1`,
      [lesson.rows[0].prerequisite_id]
    );
    if (prereq.rows.length > 0 && !prereq.rows[0].shown) {
      throw new Error('PREREQUISITE_NOT_MET');
    }
  }

  await db.query(
    `UPDATE lessons SET shown = true, shown_at = NOW() WHERE id = $1`,
    [lessonId]
  );
}

export async function createLesson(familyId: string, data: {
  title: string; content: string; sort_order: number;
  trigger_event: string; prerequisite_id?: string;
}): Promise<Lesson> {
  const result = await db.query(
    `INSERT INTO lessons (family_id, title, content, sort_order, trigger_event, prerequisite_id)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [familyId, data.title, data.content, data.sort_order, data.trigger_event, data.prerequisite_id || null]
  );
  return result.rows[0];
}
