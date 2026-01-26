const { Client } = require('pg');

const client = new Client({
  host: process.env.DATABASE_HOST || 'localhost',
  port: process.env.DATABASE_PORT || 5432,
  database: process.env.DATABASE_NAME || 'strapi',
  user: process.env.DATABASE_USERNAME || 'postgres',
  password: process.env.DATABASE_PASSWORD || 'postgres'
});

async function removeOrganizationFields() {
  try {
    await client.connect();
    console.log('🚀 Conectado ao banco de dados\n');

    const tableName = '"users-permissions_user"';
    const fieldsToRemove = [
      'organizationType',
      'organizationName',
      'businessName',
      'businessType',
      'businessAddress',
      'businessPhone'
    ];

    console.log('📋 Verificando campos existentes...\n');

    // Verificar quais campos existem
    for (const field of fieldsToRemove) {
      const checkQuery = `
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users-permissions_user' 
        AND column_name = '${field}'
      `;
      
      const result = await client.query(checkQuery);
      
      if (result.rows.length > 0) {
        console.log(`✅ Campo encontrado: ${field}`);
      } else {
        console.log(`⚠️  Campo não existe: ${field}`);
      }
    }

    console.log('\n🗑️  Removendo campos da tabela...\n');

    // Remover cada campo
    for (const field of fieldsToRemove) {
      try {
        const dropQuery = `ALTER TABLE ${tableName} DROP COLUMN IF EXISTS "${field}"`;
        await client.query(dropQuery);
        console.log(`✅ Campo removido: ${field}`);
      } catch (error) {
        console.log(`❌ Erro ao remover ${field}:`, error.message);
      }
    }

    console.log('\n✨ Migração concluída!\n');

    // Verificar estrutura final
    console.log('📊 Estrutura final da tabela users-permissions_user:\n');
    const finalStructure = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users-permissions_user'
      ORDER BY ordinal_position
    `);

    finalStructure.rows.forEach(col => {
      console.log(`   • ${col.column_name.padEnd(30)} ${col.data_type}`);
    });

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await client.end();
  }
}

removeOrganizationFields();
