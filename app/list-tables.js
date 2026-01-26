/**
 * Script para listar tabelas do banco
 */

const { Client } = require('pg');

const client = new Client({
  host: '127.0.0.1',
  port: 5432,
  database: 'strapi',
  user: 'postgres',
  password: 'postgres'
});

async function listTables() {
  try {
    await client.connect();
    console.log('🚀 Conectado ao banco de dados\n');

    const result = await client.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename
    `);

    console.log('📋 TABELAS NO BANCO:\n');
    result.rows.forEach(row => {
      console.log(`   • ${row.tablename}`);
    });

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await client.end();
  }
}

listTables();
