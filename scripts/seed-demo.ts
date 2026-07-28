import { db } from '../src/db/client.js';
import { seedFamilyCategories } from '../src/services/category.service.js';

async function seedDemoData() {
  console.log('Seeding demo data...');

  const parentResult = await db.query(
    `INSERT INTO users (email, name) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING *`,
    ['demo@piggybank.app', 'Demo Parent']
  );
  let parent = parentResult.rows[0];
  if (!parent) {
    const existing = await db.query(`SELECT * FROM users WHERE email = 'demo@piggybank.app'`);
    parent = existing.rows[0];
  }

  const familyResult = await db.query(
    `INSERT INTO families (name, currency, created_by) VALUES ($1, 'NGN', $2) ON CONFLICT DO NOTHING RETURNING *`,
    ['Demo Family', parent.id]
  );
  let family = familyResult.rows[0];
  if (!family) {
    const existing = await db.query(`SELECT * FROM families WHERE name = 'Demo Family'`);
    family = existing.rows[0];
  }

  await db.query(
    `INSERT INTO family_parents (family_id, user_id, role) VALUES ($1, $2, 'primary') ON CONFLICT DO NOTHING`,
    [family.id, parent.id]
  );

  await seedFamilyCategories(family.id);

  const child1Result = await db.query(
    `INSERT INTO users (name, is_lightweight) VALUES ('Johnny', true) RETURNING *`
  );
  const child2Result = await db.query(
    `INSERT INTO users (name, is_lightweight) VALUES ('Emma', true) RETURNING *`
  );

  const wallet1Result = await db.query(
    `INSERT INTO wallets (family_id, user_id, balance) VALUES ($1, $2, 8250) RETURNING *`,
    [family.id, child1Result.rows[0].id]
  );
  const wallet2Result = await db.query(
    `INSERT INTO wallets (family_id, user_id, balance) VALUES ($1, $2, 4500) RETURNING *`,
    [family.id, child2Result.rows[0].id]
  );

  console.log('Demo data seeded!');
  console.log(`Family ID: ${family.id}`);
  console.log(`Parent: ${parent.email}`);
  console.log(`Johnny: wallet=${wallet1Result.rows[0].id}, balance=₦8,250`);
  console.log(`Emma: wallet=${wallet2Result.rows[0].id}, balance=₦4,500`);

  process.exit(0);
}

seedDemoData().catch(err => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
