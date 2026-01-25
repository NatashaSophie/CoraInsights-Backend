const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'postgres',
  database: 'strapi'
});

async function checkPermissions() {
  try {
    await client.connect();
    
    const result = await client.query(`
      SELECT p.action, p.enabled 
      FROM "users-permissions_permission" p 
      JOIN "users-permissions_role" r ON p.role = r.id 
      WHERE r.type = 'public' AND p.controller = 'trail-route'
      ORDER BY p.action
    `);
    
    console.log('\n🔍 Permissões Trail-Route (Role: Public):\n');
    
    if (result.rows.length === 0) {
      console.log('❌ Nenhuma permissão encontrada!\n');
      console.log('Criando permissões...\n');
      
      // Buscar role public
      const roleResult = await client.query(`
        SELECT id FROM "users-permissions_role" WHERE type = 'public'
      `);
      
      if (roleResult.rows.length === 0) {
        console.log('❌ Role "public" não encontrada!');
        return;
      }
      
      const roleId = roleResult.rows[0].id;
      
      // Criar permissões
      await client.query(`
        INSERT INTO "users-permissions_permission" (role, type, controller, action, enabled, policy, created_at, updated_at)
        VALUES 
          ($1, 'application', 'trail-route', 'find', true, '', NOW(), NOW()),
          ($1, 'application', 'trail-route', 'findone', true, '', NOW(), NOW()),
          ($1, 'application', 'trail-route', 'count', true, '', NOW(), NOW())
        ON CONFLICT DO NOTHING
      `, [roleId]);
      
      console.log('✅ Permissões criadas!\n');
      
    } else {
      result.rows.forEach(row => {
        const status = row.enabled ? '✅ Habilitada' : '❌ Desabilitada';
        console.log(`  ${row.action}: ${status}`);
      });
      console.log();
    }
    
    // Testar endpoint
    console.log('🧪 Testando endpoint...\n');
    const testQuery = await client.query('SELECT id FROM trail_routes LIMIT 1');
    
    if (testQuery.rows.length > 0) {
      console.log(`✓ Existe trail-route com ID: ${testQuery.rows[0].id}`);
      console.log(`\n📍 Teste no navegador: http://localhost:1337/trail-routes/${testQuery.rows[0].id}\n`);
    } else {
      console.log('❌ Nenhuma trail-route encontrada no banco!\n');
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await client.end();
  }
}

checkPermissions();
