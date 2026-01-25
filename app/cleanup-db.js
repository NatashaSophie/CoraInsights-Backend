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
    console.log('🧹 Limpando dados antigos...\n');

    // Ordem: primeiro trail_parts (tem FK), depois checkpoints_components, depois checkpoints e locations
    await client.query('DELETE FROM trail_parts');
    console.log('  ✓ Trail parts removidos');
    
    await client.query('DELETE FROM checkpoints_components');
    console.log('  ✓ Ligações checkpoint-location removidas');
    
    await client.query('DELETE FROM checkpoints');
    console.log('  ✓ Checkpoints removidos');
    
    await client.query('DELETE FROM components_general_locations');
    console.log('  ✓ Localizações removidas');
    
    console.log('\n✅ Limpeza concluída! Pode executar o seed novamente.\n');

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await client.end();
  }
}

cleanup();
