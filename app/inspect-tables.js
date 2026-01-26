const { Client } = require('pg');
const { table } = require('console');

const client = new Client({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'postgres',
  database: 'strapi'
});

const emojis = ['📍', '🔗', '🚶', '🗺️', '🛤️', '👤', '🏢', '📄', '⚙️', '🧩'];
let emojiIndex = 0;

async function inspectAllTables() {
  try {
    await client.connect();

    // Get all user-defined tables in the public schema
    const tablesResult = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
        AND table_name NOT LIKE 'pg_%'
        AND table_name NOT LIKE 'sql_%'
        AND table_name NOT IN ('strapi_administrator', 'strapi_permission', 'strapi_role', 'strapi_user', 'strapi_webhooks', 'strapi_api_tokens', 'files_related_morphs', 'admin_permissions_role_links')
      ORDER BY table_name;
    `);

    const tableNames = tablesResult.rows.map(row => row.table_name);

    for (const tableName of tableNames) {
      const emoji = emojis[emojiIndex % emojis.length];
      console.log(`\n${emoji} Estrutura da tabela ${tableName.toUpperCase()}:`);
      
      const schemaResult = await client.query(`
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = $1
        ORDER BY ordinal_position;
      `, [tableName]);
      
      console.table(schemaResult.rows);
      emojiIndex++;
    }

  } catch (error) {
    console.error('Erro ao inspecionar tabelas:', error.message);
  } finally {
    await client.end();
  }
}

inspectAllTables();

