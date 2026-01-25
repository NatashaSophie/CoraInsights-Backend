const { Pool } = require('pg');
const { mapearCheckpointsFromDB, gerarTrackedPath } = require('./route-utils');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'postgres',
  database: 'strapi'
});

function adicionarTempo(data, horas) {
  return new Date(data.getTime() + horas * 3600000);
}

function parsearHoras(timeString) {
  // Converte "HH:MM:SS" para horas decimais
  const [hours, minutes, seconds] = timeString.split(':').map(Number);
  return hours + (minutes / 60) + (seconds / 3600);
}

function gerarCodigoCertificado() {
  const letras = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numeros = '0123456789';
  let codigo = 'CCC-';
  for (let i = 0; i < 4; i++) {
    codigo += letras[Math.floor(Math.random() * letras.length)];
  }
  codigo += '-';
  for (let i = 0; i < 4; i++) {
    codigo += numeros[Math.floor(Math.random() * numeros.length)];
  }
  return codigo;
}

async function seedTrailsAndRoutes() {
  const client = await pool.connect();
  
  try {
    console.log('🌱 Iniciando seed com GPS REALISTA baseado no traçado real...\n');

    // Mapear checkpoints do banco de dados para o traçado real
    const checkpointMapping = await mapearCheckpointsFromDB(client);

    // Buscar trail-parts
    const trailPartsResult = await client.query(`
      SELECT id, name, time, "fromCheckpoint", "toCheckpoint", distance
      FROM trail_parts
      ORDER BY id
    `);
    const trailParts = trailPartsResult.rows;
    console.log(`✅ ${trailParts.length} trechos da trilha carregados`);

    // Buscar usuários (exceto admin@example.com)
    const usersResult = await client.query(`
      SELECT id FROM "users-permissions_user" WHERE email != 'admin@example.com'
    `);
    const users = usersResult.rows;
    console.log(`✅ ${users.length} usuários encontrados\n`);

    if (users.length === 0) {
      console.error('❌ Nenhum usuário encontrado. Crie usuários primeiro.');
      return;
    }

    // Configurações de GPS realista
    const INTERVALO_COLETA_GPS = 45; // segundos entre cada ponto GPS
    const FATOR_VELOCIDADE_MIN = 0.7; // usuário mais rápido: 30% mais rápido
    const FATOR_VELOCIDADE_MAX = 1.3; // usuário mais lento: 30% mais lento

    console.log('⚙️ Configuração GPS:');
    console.log(`  📍 Coleta a cada ${INTERVALO_COLETA_GPS} segundos`);
    console.log(`  🏃 Velocidade: ${FATOR_VELOCIDADE_MIN}x a ${FATOR_VELOCIDADE_MAX}x do tempo estimado\n`);

    // Criar lookup de checkpoints por ID
    const checkpointLookup = {};
    for (const cp of checkpointMapping) {
      checkpointLookup[cp.id] = cp;
    }

    let trailsCreated = 0;
    let routesCreated = 0;
    let certificatesCreated = 0;

    // Criar 50 trilhas com diferentes cenários
    const scenarios = [
      { name: 'Completas (13 trechos)', count: 20, segmentos: 13, finalized: true },
      { name: 'Parciais concluídas (1-12)', count: 15, segmentos: 12, finalized: true },
      { name: 'Iniciantes concluídas (1-3)', count: 10, segmentos: 3, finalized: true },
      { name: 'Em andamento (1-6)', count: 5, segmentos: 6, finalized: false }
    ];

    for (const scenario of scenarios) {
      console.log(`\n🎯 Criando ${scenario.count} trilhas: ${scenario.name}`);

      for (let i = 0; i < scenario.count; i++) {
        const userId = users[Math.floor(Math.random() * users.length)].id;
        
        // Fator de velocidade aleatório para este usuário
        const fatorVelocidade = FATOR_VELOCIDADE_MIN + 
          Math.random() * (FATOR_VELOCIDADE_MAX - FATOR_VELOCIDADE_MIN);
        
        // Data de início aleatória nos últimos 6 meses
        const diasAtras = Math.floor(Math.random() * 180);
        const startedAt = new Date();
        startedAt.setDate(startedAt.getDate() - diasAtras);
        startedAt.setHours(6 + Math.floor(Math.random() * 4), Math.floor(Math.random() * 60), 0, 0);

        let currentTime = new Date(startedAt);
        const modality = Math.random() > 0.5 ? 'pedestre' : 'bicicleta';
        const inversePaths = Math.random() > 0.7;

        // Criar trail
        const trailResult = await client.query(`
          INSERT INTO trails 
          ("user", "startedAt", "finishedAt", modality, "inversePaths", created_at, updated_at) 
          VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
          RETURNING id
        `, [userId, startedAt, scenario.finalized ? currentTime : null, modality, inversePaths]);
        
        const trailId = trailResult.rows[0].id;
        trailsCreated++;

        // Criar trail-routes para os segmentos
        const numSegmentos = scenario.segmentos;
        
        for (let t = 0; t < numSegmentos; t++) {
          const trailPartIndex = inversePaths ? (trailParts.length - 1 - t) : t;
          const trailPart = trailParts[trailPartIndex];

          // Buscar checkpoints do mapeamento
          const cpInicio = checkpointLookup[trailPart.fromCheckpoint];
          const cpFim = checkpointLookup[trailPart.toCheckpoint];

          if (!cpInicio || !cpFim) {
            console.warn(`  ⚠️ Checkpoint não encontrado para ${trailPart.name} (de ${trailPart.fromCheckpoint} para ${trailPart.toCheckpoint})`);
            continue;
          }

          // Gerar trackedPath REALISTA usando o traçado real
          const duracaoHoras = parsearHoras(trailPart.time);
          const trackedPath = gerarTrackedPath(
            cpInicio,
            cpFim,
            currentTime,
            duracaoHoras,
            fatorVelocidade,
            INTERVALO_COLETA_GPS
          );

          const pontos = JSON.parse(trackedPath);
          const duracaoReal = duracaoHoras * fatorVelocidade;
          const finishedAt = adicionarTempo(currentTime, duracaoReal);

          // Debug timestamps
          if (isNaN(currentTime.getTime()) || isNaN(finishedAt.getTime())) {
            console.error(`  ❌ Erro de timestamp: currentTime=${currentTime}, finishedAt=${finishedAt}, duracaoReal=${duracaoReal}`);
            throw new Error('Timestamp inválido detectado');
          }

          await client.query(`
            INSERT INTO trail_routes 
            (trail, route, "trackedPath", "finishedAt", created_at, updated_at)
            VALUES ($1, $2, $3, $4, NOW(), NOW())
          `, [trailId, trailPart.id, trackedPath, finishedAt]);

          routesCreated++;
          currentTime = finishedAt;

          // Pausa entre trechos (5-30 minutos)
          const pausaMinutos = 5 + Math.floor(Math.random() * 25);
          currentTime = adicionarTempo(currentTime, pausaMinutos / 60);
        }

        // Gerar certificado para trilhas finalizadas (completas ou parciais)
        if (scenario.finalized) {
          const codigo = gerarCodigoCertificado();

          await client.query(`
            INSERT INTO certificates
            (code, trail, created_at, updated_at)
            VALUES ($1, $2, NOW(), NOW())
          `, [codigo, trailId]);

          certificatesCreated++;
        }

        // Mostrar progresso
        if ((i + 1) % 5 === 0 || i + 1 === scenario.count) {
          const routeResult = await client.query(
            'SELECT "trackedPath" FROM trail_routes WHERE trail = $1 LIMIT 1',
            [trailId]
          );
          const trackedPathData = routeResult.rows[0]?.trackedPath;
          const pontosExemplo = Array.isArray(trackedPathData) ? trackedPathData : (trackedPathData ? JSON.parse(trackedPathData) : []);
          console.log(`  ✅ ${i + 1}/${scenario.count} - Trail ${trailId}, velocidade ${fatorVelocidade.toFixed(2)}x, ${pontosExemplo.length} pontos GPS`);
        }
      }
    }

    console.log('\n📊 RESUMO:');
    console.log(`  🏔️  Trilhas criadas: ${trailsCreated}`);
    console.log(`  🗺️  Rotas criadas: ${routesCreated}`);
    console.log(`  🏆 Certificados: ${certificatesCreated}`);
    console.log('\n✨ Seed concluído com GPS REALISTA seguindo o traçado do KML!');
    console.log('📍 Pontos coletados a cada 45 segundos');
    console.log('🏃 Velocidade variável por usuário (0.7x a 1.3x)');
    console.log('🗺️  Seguindo as 1878 coordenadas reais do Caminho de Cora Coralina\n');

  } catch (error) {
    console.error('❌ Erro no seed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Executar seed
seedTrailsAndRoutes()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
