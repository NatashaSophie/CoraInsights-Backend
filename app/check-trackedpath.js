const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'postgres',
  database: 'strapi'
});

async function checkTrackedPath() {
  try {
    await client.connect();
    
    const result = await client.query(`
      SELECT id, "trackedPath" 
      FROM trail_routes 
      WHERE id = 506
    `);
    
    if (result.rows.length === 0) {
      console.log('❌ Trail-route 506 não encontrada');
      return;
    }
    
    const trackedPath = result.rows[0].trackedPath;
    
    console.log('\n📊 Trail-Route 506:');
    console.log('Tipo:', typeof trackedPath);
    console.log('É array?', Array.isArray(trackedPath));
    
    if (trackedPath) {
      console.log('Quantidade de pontos:', trackedPath.length);
      console.log('Primeiro ponto:', JSON.stringify(trackedPath[0]));
      console.log('Último ponto:', JSON.stringify(trackedPath[trackedPath.length - 1]));
    } else {
      console.log('❌ trackedPath é NULL');
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await client.end();
  }
}

checkTrackedPath();
