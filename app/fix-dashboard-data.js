const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'strapi',
  user: 'postgres',
  password: 'postgres'
});

async function fixData() {
  try {
    await client.connect();
    console.log('🔧 Iniciando correções...\n');

    // 1. Padronizar valores de sexo: M -> Male, F -> Female
    const updateMale = await client.query(`
      UPDATE "users-permissions_user" 
      SET sex = 'Male' 
      WHERE sex = 'M' AND "userType" = 'pilgrim'
    `);
    console.log(`✅ ${updateMale.rowCount} usuários atualizados: M -> Male`);

    const updateFemale = await client.query(`
      UPDATE "users-permissions_user" 
      SET sex = 'Female' 
      WHERE sex = 'F' AND "userType" = 'pilgrim'
    `);
    console.log(`✅ ${updateFemale.rowCount} usuários atualizados: F -> Female`);

    // 2. Verificar distribuição após correção
    const sexResult = await client.query(`
      SELECT sex, COUNT(*) 
      FROM "users-permissions_user" 
      WHERE "userType" = 'pilgrim' AND blocked = false 
      GROUP BY sex
    `);
    console.log('\n👥 Nova distribuição por sexo:');
    sexResult.rows.forEach(row => {
      console.log(`   ${row.sex}: ${row.count}`);
    });

    // 3. Adicionar datas realistas para percursos concluídos
    console.log('\n⏱️  Atualizando datas dos percursos concluídos...');
    
    const trailsResult = await client.query(`
      SELECT id FROM trails WHERE "finishedAt" IS NOT NULL
    `);

    for (const trail of trailsResult.rows) {
      // Gerar tempo aleatório entre 4 e 12 horas (caminhada realista)
      const hoursToWalk = Math.floor(Math.random() * 8 + 4); // 4-12 horas
      const minutesToAdd = Math.floor(Math.random() * 60); // minutos aleatórios
      
      // startedAt será a data de criação do percurso
      // finishedAt será startedAt + tempo de caminhada
      await client.query(`
        UPDATE trails 
        SET 
          "startedAt" = created_at,
          "finishedAt" = created_at + interval '${hoursToWalk} hours ${minutesToAdd} minutes',
          updated_at = NOW()
        WHERE id = $1
      `, [trail.id]);
    }

    console.log(`✅ ${trailsResult.rows.length} percursos tiveram as datas atualizadas`);

    // 4. Verificar tempo médio atualizado
    const timeResult = await client.query(`
      SELECT 
        COUNT(*) as count,
        AVG(EXTRACT(EPOCH FROM ("finishedAt" - "startedAt")) / 3600) as avg_hours,
        MIN(EXTRACT(EPOCH FROM ("finishedAt" - "startedAt")) / 3600) as min_hours,
        MAX(EXTRACT(EPOCH FROM ("finishedAt" - "startedAt")) / 3600) as max_hours
      FROM trails 
      WHERE "finishedAt" IS NOT NULL AND "startedAt" IS NOT NULL
    `);
    console.log('\n📊 Estatísticas de tempo após correção:');
    console.log(`   Percursos: ${timeResult.rows[0].count}`);
    console.log(`   Tempo médio: ${parseFloat(timeResult.rows[0].avg_hours).toFixed(2)} horas`);
    console.log(`   Tempo mínimo: ${parseFloat(timeResult.rows[0].min_hours).toFixed(2)} horas`);
    console.log(`   Tempo máximo: ${parseFloat(timeResult.rows[0].max_hours).toFixed(2)} horas`);

    await client.end();
    console.log('\n✨ Correções concluídas com sucesso!');
  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error(error.stack);
    await client.end();
  }
}

fixData();
