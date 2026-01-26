const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'strapi',
  user: 'postgres',
  password: 'postgres'
});

async function listTables() {
  try {
    await client.connect();
    
    const result = await client.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND (tablename LIKE '%trail%' OR tablename LIKE '%trecho%' OR tablename LIKE '%part%' OR tablename LIKE '%route%')
      ORDER BY tablename
    `);
    
    console.log('📋 Tabelas relacionadas:');
    result.rows.forEach(r => console.log('  -', r.tablename));
    
    await client.end();
  } catch (error) {
    console.error('Erro:', error.message);
    await client.end();
  }
}

listTables();
