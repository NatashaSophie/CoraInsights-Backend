const Strapi = require('strapi');

async function checkTables() {
  const strapiInstance = new Strapi();
  
  console.log('🔍 Listando todas as tabelas do banco...\n');
  
  try {
    await strapiInstance.load();
    
    const tables = await strapiInstance.connections.default.raw(`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    `);
    
    console.log('📊 Tabelas encontradas:');
    tables.forEach((table, index) => {
      console.log(`  ${index + 1}. ${table.tablename}`);
    });

    // Procurar por tabelas que contenham "user"
    console.log('\n🔎 Procurando tabelas com "user" no nome:');
    const userTables = tables.filter(t => t.tablename.toLowerCase().includes('user'));
    if (userTables.length > 0) {
      userTables.forEach(table => {
        console.log(`  ✓ ${table.tablename}`);
      });
    } else {
      console.log('  ❌ Nenhuma tabela encontrada com "user" no nome');
    }

    // Mostrar colunas da primeira tabela que contém "user"
    if (userTables.length > 0) {
      console.log(`\n📋 Colunas da tabela "${userTables[0].tablename}":"`);
      const columns = await strapiInstance.connections.default.raw(`
        SELECT column_name, data_type FROM information_schema.columns 
        WHERE table_name = '${userTables[0].tablename}'
      `);
      columns.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type}`);
      });
    }

  } catch (error) {
    console.error('Erro:', error.message);
  }
  
  process.exit(0);
}

checkTables();
