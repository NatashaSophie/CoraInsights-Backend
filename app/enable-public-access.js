const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'postgres',
  database: 'strapi'
});

async function enablePublicAccess() {
  try {
    await client.connect();
    console.log('🔓 Habilitando acesso público à API trail-routes...\n');

    // Buscar a role "Public"
    const roleResult = await client.query(`
      SELECT id FROM "users-permissions_role" WHERE type = 'public'
    `);

    if (roleResult.rows.length === 0) {
      console.error('❌ Role "public" não encontrada');
      return;
    }

    const publicRoleId = roleResult.rows[0].id;
    console.log(`✓ Role "public" encontrada (ID: ${publicRoleId})`);

    // Verificar se já existe permissão
    const existingPerm = await client.query(`
      SELECT * FROM "users-permissions_permission" 
      WHERE role = $1 AND type = 'application' AND controller = 'trail-route' AND action = 'findone'
    `, [publicRoleId]);

    if (existingPerm.rows.length > 0) {
      // Atualizar para enabled = true
      await client.query(`
        UPDATE "users-permissions_permission" 
        SET enabled = true 
        WHERE role = $1 AND type = 'application' AND controller = 'trail-route'
      `, [publicRoleId]);
      console.log('✓ Permissões atualizadas para trail-route');
    } else {
      // Criar novas permissões
      await client.query(`
        INSERT INTO "users-permissions_permission" (role, type, controller, action, enabled, policy)
        VALUES 
          ($1, 'application', 'trail-route', 'find', true, ''),
          ($1, 'application', 'trail-route', 'findone', true, '')
      `, [publicRoleId]);
      console.log('✓ Permissões criadas para trail-route');
    }

    console.log('\n✅ Acesso público habilitado!');
    console.log('📍 Teste: http://localhost:1337/trail-routes/1\n');

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await client.end();
  }
}

enablePublicAccess();
