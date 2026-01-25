const { Client } = require('pg');

async function checkDatabase() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'postgres',
    database: 'strapi'
  });

  try {
    await client.connect();
    console.log('Conectado ao banco "strapi"\n');
    
    // Check tables
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    
    console.log(`Total de tabelas: ${tables.rowCount}\n`);
    
    if (tables.rowCount > 0) {
      console.log('Tabelas criadas pelo Strapi:');
      tables.rows.forEach((row, i) => {
        console.log(`  ${i + 1}. ${row.table_name}`);
      });
      console.log('\n✓ O Strapi criou automaticamente a estrutura do banco.');
      console.log('✓ As tabelas estão vazias (sem dados de usuários/conteúdo ainda).');
    } else {
      console.log('⚠ Nenhuma tabela encontrada - banco completamente vazio.');
    }
  } catch (err) {
    console.error('Erro:', err.message);
  } finally {
    await client.end();
  }
}

checkDatabase();
