const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'postgres',
  database: 'strapi',
});

async function fixDraftRoutes() {
  try {
    await client.connect();
    console.log('📡 Conectado ao banco de dados');

    // Despublicar rotas das trilhas não finalizadas (em andamento)
    // Trilhas em andamento são aquelas sem finishedAt
    const result = await client.query(`
      UPDATE trail_routes 
      SET published_at = NULL
      WHERE trail IN (
        SELECT id FROM trails WHERE "finishedAt" IS NULL
      )
    `);

    console.log(`✅ ${result.rowCount} rotas despublicadas (trilhas em andamento)`);

    // Verificar quantas rotas ficaram publicadas vs draft
    const stats = await client.query(`
      SELECT 
        COUNT(*) FILTER (WHERE published_at IS NOT NULL) as published,
        COUNT(*) FILTER (WHERE published_at IS NULL) as draft
      FROM trail_routes
    `);

    console.log(`\n📊 Status das rotas:`);
    console.log(`   Publicadas: ${stats.rows[0].published}`);
    console.log(`   Draft: ${stats.rows[0].draft}`);

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await client.end();
  }
}

fixDraftRoutes();
