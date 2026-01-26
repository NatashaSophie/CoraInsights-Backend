const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'strapi',
  user: 'postgres',
  password: 'postgres'
});

async function checkAdmin() {
  try {
    await client.connect();
    console.log('🔍 Verificando usuário admin...\n');

    // Verificar admin users
    const adminResult = await client.query(`
      SELECT id, username, email, blocked
      FROM strapi_administrator
      ORDER BY id
    `);
    
    console.log('👤 Usuários administrativos:');
    if (adminResult.rows.length === 0) {
      console.log('   ❌ Nenhum usuário admin encontrado!');
    } else {
      adminResult.rows.forEach(admin => {
        console.log(`   ID: ${admin.id}`);
        console.log(`   Username: ${admin.username}`);
        console.log(`   Email: ${admin.email}`);
        console.log(`   Bloqueado: ${admin.blocked ? 'Sim' : 'Não'}`);
        console.log('');
      });
    }

    await client.end();
  } catch (error) {
    console.error('❌ Erro:', error.message);
    await client.end();
  }
}

checkAdmin();
