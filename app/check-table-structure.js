// Script para verificar a estrutura da tabela users-permissions_user
const { Pool } = require('pg');

// Conexão com Docker (durante desenvolvimento)
const config = {
  host: process.env.DATABASE_HOST || 'postgres',
  port: process.env.DATABASE_PORT || 5432,
  user: process.env.DATABASE_USERNAME || 'strapi',
  password: process.env.DATABASE_PASSWORD || 'strapi',
  database: process.env.DATABASE_NAME || 'strapi'
};

// Para execução local, tente com localhost  
const localConfig = {
  ...config,
  host: 'localhost'
};

async function checkTableStructure() {
  const pool = new Pool(localConfig);
  
  try {
    const client = await pool.connect();
    
    console.log('\n📋 Estrutura da tabela users-permissions_user:\n');
    
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'users-permissions_user'
      ORDER BY ordinal_position;
    `);
    
    result.rows.forEach(col => {
      console.log(`  ${col.column_name.padEnd(25)} | ${col.data_type.padEnd(15)} | Nullable: ${col.is_nullable}`);
    });
    
    console.log('\n📊 Amostra de usuários:\n');
    const users = await client.query(`
      SELECT id, email, username, role 
      FROM "users-permissions_user" 
      LIMIT 5;
    `);
    
    users.rows.forEach(user => {
      console.log(`  ID: ${user.id}, Email: ${user.email}, Username: ${user.username}, Role: ${user.role}`);
    });
    
    client.release();
  } catch (err) {
    console.error('Erro:', err.message);
  } finally {
    await pool.end();
  }
}

checkTableStructure();
