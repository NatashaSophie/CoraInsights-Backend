/**
 * Script para listar todas as tabelas e seus campos
 */

const { Client } = require('pg');

const client = new Client({
  host: '127.0.0.1',
  port: 5432,
  database: 'strapi',
  user: 'postgres',
  password: 'postgres'
});

async function listTablesWithColumns() {
  try {
    await client.connect();
    console.log('🚀 Conectado ao banco de dados\n');

    // Buscar todas as tabelas públicas
    const tablesResult = await client.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename
    `);

    console.log(`📊 BANCO DE DADOS: strapi\n`);
    console.log(`Total de tabelas: ${tablesResult.rows.length}\n`);
    console.log('='.repeat(80));

    for (const table of tablesResult.rows) {
      const tableName = table.tablename;
      
      // Buscar colunas da tabela
      const columnsResult = await client.query(`
        SELECT 
          column_name,
          data_type,
          character_maximum_length,
          is_nullable,
          column_default
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = $1
        ORDER BY ordinal_position
      `, [tableName]);

      console.log(`\n📋 Tabela: ${tableName}`);
      console.log('-'.repeat(80));
      
      if (columnsResult.rows.length === 0) {
        console.log('   (sem colunas)');
      } else {
        columnsResult.rows.forEach(col => {
          const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
          const maxLength = col.character_maximum_length ? `(${col.character_maximum_length})` : '';
          const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : '';
          
          console.log(`   • ${col.column_name.padEnd(30)} ${col.data_type}${maxLength.padEnd(8)} ${nullable}${defaultVal}`);
        });
      }

      // Contar registros
      try {
        const countResult = await client.query(`SELECT COUNT(*) as count FROM "${tableName}"`);
        console.log(`   Registros: ${countResult.rows[0].count}`);
      } catch (err) {
        console.log(`   Registros: (erro ao contar)`);
      }
    }

    console.log('\n' + '='.repeat(80));

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await client.end();
  }
}

listTablesWithColumns();
