const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'postgres',
  database: 'strapi'
});

async function publishTrailRoutes() {
  const client = await pool.connect();
  
  try {
    console.log('📢 Publicando todas as trail routes...\n');

    const result = await client.query(`
      UPDATE trail_routes 
      SET published_at = NOW(), updated_at = NOW()
      WHERE published_at IS NULL
      RETURNING id
    `);

    console.log(`✅ ${result.rowCount} trail routes publicadas com sucesso!\n`);

  } catch (error) {
    console.error('❌ Erro ao publicar:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

publishTrailRoutes()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
