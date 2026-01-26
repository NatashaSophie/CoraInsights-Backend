const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'strapi',
  user: 'postgres',
  password: 'postgres'
});

async function checkStructure() {
  try {
    await client.connect();
    
    const result = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'trail_routes'
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Estrutura da tabela trail_routes:');
    result.rows.forEach(row => {
      console.log(`   ${row.column_name}: ${row.data_type}`);
    });

    // Mostrar amostra de dados
    const sample = await client.query(`
      SELECT * FROM trail_routes LIMIT 3
    `);
    
    console.log('\n📝 Amostra de dados:');
    sample.rows.forEach(row => {
      console.log(JSON.stringify(row, null, 2));
    });
    
    await client.end();
  } catch (error) {
    console.error('Erro:', error.message);
    await client.end();
  }
}

checkStructure();
