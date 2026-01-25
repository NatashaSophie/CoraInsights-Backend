const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'postgres',
  database: 'strapi'
});

async function countUsers() {
  try {
    await client.connect();
    
    // Contar total de usuários
    const totalResult = await client.query('SELECT COUNT(*) as total FROM "users-permissions_user"');
    const total = totalResult.rows[0].total;
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📊 Total de usuários no banco: ${total}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    // Mostrar os primeiros usuários
    console.log('👤 Primeiros 5 usuários cadastrados:');
    const usersResult = await client.query(`
      SELECT id, username, email, name, role 
      FROM "users-permissions_user" 
      ORDER BY id 
      LIMIT 5
    `);
    
    usersResult.rows.forEach(u => {
      console.log(`  ${u.id}. ${u.username}`);
      console.log(`     Email: ${u.email}`);
      console.log(`     Nome: ${u.name || '(não informado)'}`);
      console.log(`     Role ID: ${u.role}\n`);
    });
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await client.end();
  }
}

countUsers();
