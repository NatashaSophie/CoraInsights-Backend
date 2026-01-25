const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'postgres',
  database: 'strapi',
});

async function addMapUrls() {
  try {
    await client.connect();
    console.log('📡 Conectado ao banco de dados');

    // Atualizar todas as trail_routes com o mapUrl
    const result = await client.query(`
      UPDATE trail_routes 
      SET "mapUrl" = 'http://localhost:1337/trail-route-map.html?id=' || id::text
      WHERE "mapUrl" IS NULL
    `);

    console.log(`✅ ${result.rowCount} trail routes atualizadas com mapUrl`);

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await client.end();
  }
}

addMapUrls();
