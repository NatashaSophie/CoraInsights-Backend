const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'strapi',
  user: 'postgres',
  password: 'postgres'
});

async function enableDashboardsPermissions() {
  try {
    await client.connect();
    console.log('🚀 Conectado ao banco de dados\n');

    // Buscar role "Public"
    const roleResult = await client.query(`
      SELECT id FROM "users-permissions_role" WHERE type = 'public'
    `);

    if (roleResult.rows.length === 0) {
      console.log('❌ Role "public" não encontrada');
      return;
    }

    const publicRoleId = roleResult.rows[0].id;
    console.log(`✅ Role Public ID: ${publicRoleId}`);

    // Criar permissão para dashboards.getPublicData
    const insertResult = await client.query(`
      INSERT INTO "users-permissions_permission" (type, controller, action, enabled, policy, role)
      VALUES ('application', 'dashboards', 'getpublicdata', true, '', $1)
      ON CONFLICT DO NOTHING
      RETURNING id
    `, [publicRoleId]);

    if (insertResult.rows.length > 0) {
      console.log('✅ Permissão criada com sucesso!');
    } else {
      console.log('ℹ️ Permissão já existe');
    }

    // Verificar permissões criadas
    const checkResult = await client.query(`
      SELECT * FROM "users-permissions_permission"
      WHERE controller = 'dashboards'
    `);

    console.log(`\n📋 Permissões do controller dashboards: ${checkResult.rows.length}`);
    checkResult.rows.forEach(row => {
      console.log(`   • ${row.action} - enabled: ${row.enabled}`);
    });

    console.log('\n✨ Configuração concluída! Reinicie o Strapi.\n');

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await client.end();
  }
}

enableDashboardsPermissions();
