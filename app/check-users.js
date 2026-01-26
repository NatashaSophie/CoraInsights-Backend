/**
 * Script para verificar usuários no banco
 */

const { Client } = require('pg');

const client = new Client({
  host: '127.0.0.1',
  port: 5432,
  database: 'strapi',
  user: 'postgres',
  password: 'postgres'
});

async function checkUsers() {
  try {
    await client.connect();
    console.log('🚀 Conectado ao banco de dados\n');

    // Buscar todos os usuários
    const result = await client.query(`
      SELECT 
        id, 
        email, 
        name, 
        username,
        "userType", 
        "merchantApproved",
        "organizationType",
        "organizationName",
        "businessName",
        confirmed,
        blocked
      FROM "users-permissions_user" 
      ORDER BY id
    `);

    if (result.rows.length === 0) {
      console.log('❌ Nenhum usuário encontrado no banco!\n');
      console.log('Execute: node create-special-users.js');
      return;
    }

    console.log(`📋 USUÁRIOS NO BANCO (${result.rows.length} total):\n`);
    
    result.rows.forEach(user => {
      const type = user.userType || 'pilgrim';
      let icon = '👤';
      if (type === 'manager') icon = '👔';
      if (type === 'merchant') icon = '🏪';
      
      const status = user.confirmed ? '✅' : '⏳';
      const blocked = user.blocked ? '🔒' : '';
      
      console.log(`${icon} ${status} ${blocked} ID: ${user.id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Nome: ${user.name || 'N/A'}`);
      console.log(`   Tipo: ${type}`);
      
      if (type === 'manager') {
        console.log(`   Organização: ${user.organizationName || 'N/A'} (${user.organizationType || 'N/A'})`);
      }
      
      if (type === 'merchant') {
        const approved = user.merchantApproved ? '✅ Aprovado' : '⏳ Pendente';
        console.log(`   Negócio: ${user.businessName || 'N/A'}`);
        console.log(`   Status: ${approved}`);
      }
      
      console.log('');
    });

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await client.end();
  }
}

checkUsers();
