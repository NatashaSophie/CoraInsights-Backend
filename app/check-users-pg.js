const { Pool } = require('pg');

const pool = new Pool({
  user: 'strapi',
  password: 'strapi',
  host: 'localhost',
  port: 5432,
  database: 'strapi'
});

async function checkUsers() {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT id, email, username, role FROM "users-permissions_user"
    `);
    
    console.log('\n📋 Usuários no banco:');
    result.rows.forEach(user => {
      console.log(`  ID: ${user.id}, Email: ${user.email}, Username: ${user.username}, Role ID: ${user.role}`);
    });
  } finally {
    client.release();
    await pool.end();
  }
}

checkUsers().catch(console.error);
