const { Client } = require('pg');

async function createDatabase() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'postgres',
    database: 'postgres' // Connect to default database first
  });

  try {
    await client.connect();
    console.log('Conectado ao PostgreSQL');
    
    // Check if database exists
    const res = await client.query(
      "SELECT 1 FROM pg_database WHERE datname='strapi'"
    );
    
    if (res.rowCount === 0) {
      await client.query('CREATE DATABASE strapi');
      console.log('✓ Banco de dados "strapi" criado com sucesso!');
    } else {
      console.log('✓ Banco de dados "strapi" já existe.');
    }
  } catch (err) {
    console.error('Erro:', err.message);
  } finally {
    await client.end();
  }
}

createDatabase();
