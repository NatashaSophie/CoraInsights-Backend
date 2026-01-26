/**
 * Script para verificar/resetar senha do gestor
 */

const { Client } = require('pg');
const bcrypt = require('bcryptjs');

const client = new Client({
  host: '127.0.0.1',
  port: 5432,
  database: 'strapi',
  user: 'postgres',
  password: 'postgres'
});

async function resetGestorPassword() {
  try {
    await client.connect();
    console.log('🚀 Conectado ao banco de dados\n');

    // Buscar o gestor
    const result = await client.query(`
      SELECT id, email, name, password
      FROM "users-permissions_user" 
      WHERE email = 'gestor@cora.com'
    `);

    if (result.rows.length === 0) {
      console.log('❌ Gestor não encontrado!');
      return;
    }

    const gestor = result.rows[0];
    console.log(`👔 Gestor encontrado:`);
    console.log(`   ID: ${gestor.id}`);
    console.log(`   Email: ${gestor.email}`);
    console.log(`   Nome: ${gestor.name}`);
    console.log(`   Hash atual: ${gestor.password.substring(0, 20)}...`);

    // Nova senha
    const newPassword = 'Gestor@123';
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Atualizar senha
    await client.query(`
      UPDATE "users-permissions_user" 
      SET password = $1, updated_at = NOW()
      WHERE id = $2
    `, [hashedPassword, gestor.id]);

    console.log(`\n✅ Senha atualizada com sucesso!`);
    console.log(`\n🔐 NOVAS CREDENCIAIS:`);
    console.log(`   Email: ${gestor.email}`);
    console.log(`   Senha: ${newPassword}`);

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await client.end();
  }
}

resetGestorPassword();
