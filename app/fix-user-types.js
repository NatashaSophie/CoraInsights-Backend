const { Client } = require('pg');

const client = new Client({
  host: process.env.DATABASE_HOST || 'localhost',
  port: process.env.DATABASE_PORT || 5432,
  database: process.env.DATABASE_NAME || 'strapi',
  user: process.env.DATABASE_USERNAME || 'postgres',
  password: process.env.DATABASE_PASSWORD || 'postgres'
});

async function fixUserTypes() {
  try {
    await client.connect();
    console.log('🚀 Conectado ao banco de dados\n');

    // Verificar situação atual
    console.log('📊 Situação atual dos userTypes:\n');
    const currentStatus = await client.query(`
      SELECT 
        "userType",
        COUNT(*) as total
      FROM "users-permissions_user"
      GROUP BY "userType"
      ORDER BY "userType"
    `);

    currentStatus.rows.forEach(row => {
      console.log(`   ${row.userType || 'NULL'}: ${row.total} usuários`);
    });

    // Buscar usuários que não são manager nem merchant
    console.log('\n🔍 Buscando usuários para atualizar...\n');
    const usersToUpdate = await client.query(`
      SELECT id, email, name, "userType"
      FROM "users-permissions_user"
      WHERE "userType" IS DISTINCT FROM 'manager' 
        AND "userType" IS DISTINCT FROM 'merchant'
    `);

    console.log(`   Encontrados ${usersToUpdate.rows.length} usuários para atualizar\n`);

    if (usersToUpdate.rows.length > 0) {
      console.log('👥 Usuários que serão atualizados:');
      usersToUpdate.rows.slice(0, 10).forEach(user => {
        console.log(`   • ${user.email} (${user.name || 'Sem nome'}) - userType atual: ${user.userType || 'NULL'}`);
      });
      
      if (usersToUpdate.rows.length > 10) {
        console.log(`   ... e mais ${usersToUpdate.rows.length - 10} usuários\n`);
      } else {
        console.log('');
      }

      // Atualizar para pilgrim
      console.log('✏️  Atualizando userType para "pilgrim"...\n');
      const result = await client.query(`
        UPDATE "users-permissions_user"
        SET "userType" = 'pilgrim'
        WHERE "userType" IS DISTINCT FROM 'manager' 
          AND "userType" IS DISTINCT FROM 'merchant'
      `);

      console.log(`✅ ${result.rowCount} usuários atualizados!\n`);
    } else {
      console.log('✅ Todos os usuários já têm userType correto!\n');
    }

    // Verificar resultado final
    console.log('📊 Situação final dos userTypes:\n');
    const finalStatus = await client.query(`
      SELECT 
        "userType",
        COUNT(*) as total
      FROM "users-permissions_user"
      GROUP BY "userType"
      ORDER BY "userType"
    `);

    finalStatus.rows.forEach(row => {
      console.log(`   ${row.userType || 'NULL'}: ${row.total} usuários`);
    });

    console.log('\n✨ Operação concluída com sucesso!\n');

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await client.end();
  }
}

fixUserTypes();
