const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'postgres',
  database: 'strapi'
});

async function cleanup() {
  try {
    await client.connect();
    console.log('🧹 Limpando trilhas, rotas e certificados...\n');

    await client.query('DELETE FROM certificates');
    console.log('  ✓ Certificados removidos');
    
    await client.query('DELETE FROM trail_routes');
    console.log('  ✓ Rotas removidas');
    
    await client.query('DELETE FROM trails');
    console.log('  ✓ Trilhas removidas');
    
    console.log('\n✅ Limpeza concluída!\n');

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await client.end();
  }
}

cleanup();
