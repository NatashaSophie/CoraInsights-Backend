const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'strapi',
  user: 'postgres',
  password: 'postgres'
});

async function checkData() {
  try {
    await client.connect();
    console.log('🔍 Verificando dados do banco...\n');

    // 1. Distribuição por sexo
    const sexResult = await client.query(`
      SELECT sex, COUNT(*) 
      FROM "users-permissions_user" 
      WHERE "userType" = 'pilgrim' AND blocked = false 
      GROUP BY sex
    `);
    console.log('👥 Distribuição por sexo:');
    sexResult.rows.forEach(row => {
      console.log(`   ${row.sex || 'NULL'}: ${row.count}`);
    });

    // 2. Total de peregrinos
    const totalResult = await client.query(`
      SELECT COUNT(*) as total 
      FROM "users-permissions_user" 
      WHERE "userType" = 'pilgrim' AND blocked = false
    `);
    console.log(`\n📊 Total de peregrinos: ${totalResult.rows[0].total}`);

    // 3. Percursos
    const trailsResult = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN "finishedAt" IS NOT NULL THEN 1 END) as concluidos,
        COUNT(CASE WHEN "finishedAt" IS NULL THEN 1 END) as ativos
      FROM trails
    `);
    console.log('\n🚶 Percursos:');
    console.log(`   Total: ${trailsResult.rows[0].total}`);
    console.log(`   Concluídos: ${trailsResult.rows[0].concluidos}`);
    console.log(`   Ativos: ${trailsResult.rows[0].ativos}`);

    // 4. Tempo médio dos percursos concluídos
    const timeResult = await client.query(`
      SELECT 
        COUNT(*) as count,
        AVG(EXTRACT(EPOCH FROM ("finishedAt" - "startedAt")) / 3600) as avg_hours
      FROM trails 
      WHERE "finishedAt" IS NOT NULL AND "startedAt" IS NOT NULL
    `);
    console.log('\n⏱️  Tempo dos percursos concluídos:');
    console.log(`   Percursos com tempo: ${timeResult.rows[0].count}`);
    console.log(`   Tempo médio: ${parseFloat(timeResult.rows[0].avg_hours).toFixed(2)} horas`);

    // 5. Amostra de dados de tempo
    const sampleResult = await client.query(`
      SELECT 
        id,
        "startedAt",
        "finishedAt",
        EXTRACT(EPOCH FROM ("finishedAt" - "startedAt")) / 3600 as hours
      FROM trails 
      WHERE "finishedAt" IS NOT NULL AND "startedAt" IS NOT NULL
      LIMIT 5
    `);
    console.log('\n📋 Amostra de percursos (primeiros 5):');
    sampleResult.rows.forEach(row => {
      console.log(`   ID ${row.id}: ${row.hours?.toFixed(2) || 0} horas`);
    });

    await client.end();
    console.log('\n✅ Verificação concluída!');
  } catch (error) {
    console.error('❌ Erro:', error.message);
    await client.end();
  }
}

checkData();
