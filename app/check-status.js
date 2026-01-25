const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'postgres',
  database: 'strapi'
});

async function checkStatus() {
  try {
    await client.connect();
    
    console.log('\n📊 Status das Trail-Routes:\n');
    
    const statusResult = await client.query(`
      SELECT 
        CASE WHEN published_at IS NULL THEN 'DRAFT' ELSE 'PUBLISHED' END as status, 
        COUNT(*) 
      FROM trail_routes 
      GROUP BY status
      ORDER BY status
    `);
    
    statusResult.rows.forEach(row => {
      console.log(`  ${row.status}: ${row.count}`);
    });
    
    const draftResult = await client.query(`
      SELECT COUNT(*) 
      FROM trail_routes 
      WHERE "finishedAt" IS NULL
    `);
    
    console.log(`\n🚶 Trail-Routes em andamento (sem finishedAt): ${draftResult.rows[0].count}`);
    
    const publishedResult = await client.query(`
      SELECT COUNT(*) 
      FROM trail_routes 
      WHERE "finishedAt" IS NOT NULL
    `);
    
    console.log(`✅ Trail-Routes finalizadas (com finishedAt): ${publishedResult.rows[0].count}\n`);

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await client.end();
  }
}

checkStatus();
