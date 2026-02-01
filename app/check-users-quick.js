const Strapi = require('strapi');

async function checkUsers() {
  const strapiInstance = new Strapi();
  
  try {
    await strapiInstance.load();
    
    const users = await strapiInstance.connections.default.raw(`
      SELECT id, email, username, role FROM "users-permissions_user"
    `);
    
    console.log('📋 Usuários no banco:');
    users.forEach(user => {
      console.log(`  ID: ${user.id}, Email: ${user.email}, Username: ${user.username}, Role: ${user.role}`);
    });

  } catch (error) {
    console.error('Erro:', error);
  } finally {
    await strapiInstance.app.destroy();
  }
}

checkUsers();
