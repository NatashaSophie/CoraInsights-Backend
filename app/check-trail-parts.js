const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'strapi',
  user: 'postgres',
  password: 'postgres'
});

async function checkTrailParts() {
  try {
    await client.connect();
    console.log('🔍 Verificando dados dos trechos...\n');

    // Verificar estrutura da tabela trail_parts
    const columnsResult = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'trail_parts'
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Estrutura da tabela trail_parts:');
    columnsResult.rows.forEach(row => {
      console.log(`   ${row.column_name}: ${row.data_type}`);
    });

    // Buscar dados dos trechos
    const partsResult = await client.query(`
      SELECT * FROM trail_parts ORDER BY id
    `);
    
    console.log(`\n📊 Total de trechos cadastrados: ${partsResult.rows.length}\n`);
    
    if (partsResult.rows.length > 0) {
      console.log('🗺️  Detalhes dos trechos:');
      partsResult.rows.forEach(part => {
        console.log(`\nTrecho ${part.id}:`);
        console.log(`   Nome: ${part.name || 'N/A'}`);
        console.log(`   Origem: ${part.origin || 'N/A'}`);
        console.log(`   Destino: ${part.destination || 'N/A'}`);
        console.log(`   Distância: ${part.distance || part.length || 'N/A'} km`);
        console.log(`   Tempo médio: ${part.averageTime || part.average_time || part.duration || 'N/A'} horas`);
        console.log(`   Dificuldade: ${part.difficulty || 'N/A'}`);
      });
    }

    await client.end();
    console.log('\n✅ Verificação concluída!');
  } catch (error) {
    console.error('❌ Erro:', error.message);
    await client.end();
  }
}

checkTrailParts();
