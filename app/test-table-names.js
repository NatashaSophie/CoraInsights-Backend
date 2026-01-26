const strapi = require('./config/functions/bootstrap');

async function testQuery() {
  // Testar query com Strapi
  const result = await strapi.connections.default.raw(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name LIKE '%user%'
  `);
  
  console.log('Tables with "user":', result.rows.map(r => r.table_name));
  process.exit(0);
}

// Executar após Strapi iniciar
setTimeout(() => {
  testQuery().catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
}, 1000);
