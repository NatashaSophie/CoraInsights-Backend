const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'strapi',
  user: 'postgres',
  password: 'postgres'
});

// Tempo médio em horas para cada trecho
const trailPartTimes = {
  1: 5,   // 14.5 km
  2: 5,   // 12.7 km
  3: 8,   // 24.4 km
  4: 9,   // 30.0 km
  5: 6,   // 17.5 km
  6: 8,   // 27.0 km
  7: 12,  // 38.5 km
  8: 6,   // 17.3 km
  9: 8,   // 29.0 km
  10: 8,  // 27.0 km
  11: 8,  // 22.7 km
  12: 8,  // 29.5 km
  13: 2   // 7.5 km
};

// Distância em km de cada trecho
const trailPartDistances = {
  1: 14.5,
  2: 12.7,
  3: 24.4,
  4: 30.0,
  5: 17.5,
  6: 27.0,
  7: 38.5,
  8: 17.3,
  9: 29.0,
  10: 27.0,
  11: 22.7,
  12: 29.5,
  13: 7.5
};

async function recalculateTrailTimes() {
  try {
    await client.connect();
    console.log('🔄 Recalculando tempos dos percursos...\n');

    // Buscar todos os percursos concluídos
    const trailsResult = await client.query(`
      SELECT id, created_at, "startedAt", "finishedAt"
      FROM trails 
      WHERE "finishedAt" IS NOT NULL
      ORDER BY id
    `);

    console.log(`📊 Total de percursos concluídos: ${trailsResult.rows.length}\n`);

    let updated = 0;

    for (const trail of trailsResult.rows) {
      // Buscar os trechos completados neste percurso
      const routesResult = await client.query(`
        SELECT route
        FROM trail_routes
        WHERE trail = $1
        ORDER BY route
      `, [trail.id]);

      if (routesResult.rows.length === 0) {
        console.log(`⚠️  Percurso ${trail.id}: sem trechos, pulando...`);
        continue;
      }

      // Calcular tempo total baseado nos trechos percorridos
      let totalTime = 0;
      let totalDistance = 0;
      
      for (const route of routesResult.rows) {
        const partId = route.route;
        if (trailPartTimes[partId]) {
          totalTime += trailPartTimes[partId];
          totalDistance += trailPartDistances[partId];
        }
      }

      // Converter tempo para milissegundos
      const timeInMs = totalTime * 60 * 60 * 1000;

      // startedAt = data de criação do percurso
      // finishedAt = startedAt + tempo total calculado
      const startedAt = new Date(trail.created_at);
      const finishedAt = new Date(startedAt.getTime() + timeInMs);

      // Calcular velocidade média
      const avgSpeed = totalDistance / totalTime;

      // Atualizar o percurso
      await client.query(`
        UPDATE trails 
        SET 
          "startedAt" = $1,
          "finishedAt" = $2,
          updated_at = NOW()
        WHERE id = $3
      `, [startedAt, finishedAt, trail.id]);

      updated++;
      
      if (updated <= 5) {
        console.log(`✅ Percurso ${trail.id}:`);
        console.log(`   Trechos: ${routesResult.rows.length}`);
        console.log(`   Distância: ${totalDistance.toFixed(1)} km`);
        console.log(`   Tempo: ${totalTime.toFixed(1)} horas`);
        console.log(`   Velocidade média: ${avgSpeed.toFixed(2)} km/h`);
        console.log('');
      }
    }

    console.log(`\n✨ ${updated} percursos recalculados com sucesso!\n`);

    // Estatísticas finais
    const statsResult = await client.query(`
      SELECT 
        COUNT(*) as total,
        AVG(EXTRACT(EPOCH FROM ("finishedAt" - "startedAt")) / 3600) as avg_hours,
        MIN(EXTRACT(EPOCH FROM ("finishedAt" - "startedAt")) / 3600) as min_hours,
        MAX(EXTRACT(EPOCH FROM ("finishedAt" - "startedAt")) / 3600) as max_hours
      FROM trails 
      WHERE "finishedAt" IS NOT NULL AND "startedAt" IS NOT NULL
    `);

    console.log('📈 Estatísticas gerais:');
    console.log(`   Percursos concluídos: ${statsResult.rows[0].total}`);
    console.log(`   Tempo médio: ${parseFloat(statsResult.rows[0].avg_hours).toFixed(2)} horas`);
    console.log(`   Tempo mínimo: ${parseFloat(statsResult.rows[0].min_hours).toFixed(2)} horas`);
    console.log(`   Tempo máximo: ${parseFloat(statsResult.rows[0].max_hours).toFixed(2)} horas`);

    await client.end();
    console.log('\n✅ Processamento concluído!');
  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error(error.stack);
    await client.end();
  }
}

recalculateTrailTimes();
