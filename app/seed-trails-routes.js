const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'postgres',
  database: 'strapi'
});

// Função para converter UTM para Lat/Lon (zona 22S - Goiás)
function utmToLatLon(x, y) {
  // Ponto de referência conhecido: Corumbá de Goiás
  // UTM: x=734787, y=8238207 (medido no banco)
  // LatLon: -15.9255, -48.8104 (coordenadas reais)
  
  const xRef = 734787;
  const yRef = 8238207;
  const latRef = -15.9255;
  const lonRef = -48.8104;
  
  // Metros por grau (aproximado para latitude -16°)
  const metrosPorGrauLat = 111320;
  const metrosPorGrauLon = 107550; // cos(16°) * 111320 ≈ 107550
  
  // Calcular diferença em metros
  const deltaX = x - xRef;
  const deltaY = y - yRef;
  
  // Converter para graus
  const lat = latRef + (deltaY / metrosPorGrauLat);
  const lon = lonRef + (deltaX / metrosPorGrauLon);
  
  return { lat, lon };
}

// Função para gerar coordenadas GPS simuladas de um trecho
function gerarTrackedPath(fromCheckpoint, toCheckpoint, startTime, duracaoHoras, numPontos = 20) {
  const path = [];
  const duracaoMs = duracaoHoras * 3600000; // converter horas para milissegundos
  
  for (let i = 0; i <= numPontos; i++) {
    const progress = i / numPontos;
    const x = fromCheckpoint.x + (toCheckpoint.x - fromCheckpoint.x) * progress;
    const y = fromCheckpoint.y + (toCheckpoint.y - fromCheckpoint.y) * progress;
    
    // Adicionar pequena variação aleatória para simular desvios no caminho
    const randomX = x + (Math.random() - 0.5) * 50;
    const randomY = y + (Math.random() - 0.5) * 50;
    
    // Converter UTM para Lat/Lon
    const { lat, lon } = utmToLatLon(randomX, randomY);
    
    // Calcular timestamp baseado no progresso da rota
    const timestamp = startTime.getTime() + (progress * duracaoMs);
    
    path.push({ 
      lat: parseFloat(lat.toFixed(6)), 
      lon: parseFloat(lon.toFixed(6)), 
      timestamp 
    });
  }
  return JSON.stringify(path);
}

// Função para adicionar tempo a uma data
function adicionarTempo(data, horas) {
  const novaData = new Date(data);
  novaData.setHours(novaData.getHours() + horas);
  return novaData;
}

// Função para gerar código único de certificado
function gerarCodigoCertificado() {
  return `CORA-${Date.now()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
}

async function seedTrailsAndRoutes() {
  try {
    await client.connect();
    console.log('✓ Conectado ao banco de dados PostgreSQL\n');

    // 1. Buscar usuários
    const usersResult = await client.query('SELECT id FROM "users-permissions_user" ORDER BY id LIMIT 50');
    const users = usersResult.rows;
    console.log(`✓ ${users.length} usuários encontrados\n`);

    // 2. Buscar trail-parts com checkpoints
    const trailPartsResult = await client.query(`
      SELECT tp.id, tp.name, tp.time, tp.distance, 
             tp."fromCheckpoint", tp."toCheckpoint"
      FROM trail_parts tp
      ORDER BY tp.id
    `);
    const trailParts = trailPartsResult.rows;
    console.log(`✓ ${trailParts.length} trechos de trilha encontrados\n`);

    // 3. Buscar coordenadas dos checkpoints
    const checkpointsResult = await client.query(`
      SELECT c.id, c.name, l.x, l.y
      FROM checkpoints c
      JOIN checkpoints_components cc ON c.id = cc.checkpoint_id
      JOIN components_general_locations l ON cc.component_id = l.id
      WHERE cc.field = 'location'
      ORDER BY c.id
    `);
    const checkpointsMap = {};
    checkpointsResult.rows.forEach(cp => {
      checkpointsMap[cp.id] = cp;
    });
    console.log(`✓ ${checkpointsResult.rows.length} checkpoints mapeados\n`);

    console.log('🚶 Criando trilhas e rotas simuladas...\n');

    let trailsCreated = 0;
    let routesCreated = 0;
    let certificatesCreated = 0;

    // Cenários diferentes:
    const scenarios = [
      { type: 'completa', usuarios: 10, descricao: 'Trilha completa (13 trechos)' },
      { type: 'parcial', usuarios: 15, descricao: 'Trilha parcial (3-7 trechos)' },
      { type: 'iniciante', usuarios: 15, descricao: 'Apenas 1-2 trechos' },
      { type: 'em_andamento', usuarios: 10, descricao: 'Trilha em andamento (não finalizada)' }
    ];

    let userIndex = 0;

    for (const scenario of scenarios) {
      console.log(`\n📍 Criando cenário: ${scenario.descricao}`);
      
      for (let i = 0; i < scenario.usuarios && userIndex < users.length; i++) {
        const userId = users[userIndex].id;
        userIndex++;

        // Data de início aleatória nos últimos 6 meses
        const diasAtras = Math.floor(Math.random() * 180);
        const startedAt = new Date();
        startedAt.setDate(startedAt.getDate() - diasAtras);
        startedAt.setHours(Math.floor(Math.random() * 12) + 6, Math.floor(Math.random() * 60), 0, 0);

        const modality = Math.random() > 0.5 ? 'foot' : 'bike';
        const inversePaths = Math.random() > 0.7; // 30% fazem caminho inverso

        // Determinar quantos trechos serão percorridos
        let numTrechos;
        let finalizada = true;
        
        if (scenario.type === 'completa') {
          numTrechos = 13;
        } else if (scenario.type === 'parcial') {
          numTrechos = Math.floor(Math.random() * 5) + 3; // 3-7 trechos
        } else if (scenario.type === 'iniciante') {
          numTrechos = Math.floor(Math.random() * 2) + 1; // 1-2 trechos
        } else { // em_andamento
          numTrechos = Math.floor(Math.random() * 5) + 1;
          finalizada = false;
        }

        // Criar TRAIL
        let finishedAt = null;
        if (finalizada) {
          // Calcular tempo total baseado nos trechos
          let horasTotal = 0;
          for (let t = 0; t < numTrechos; t++) {
            const trailPartIndex = inversePaths ? (trailParts.length - 1 - t) : t;
            if (trailPartIndex >= 0 && trailPartIndex < trailParts.length) {
              const [hours, minutes] = trailParts[trailPartIndex].time.split(':');
              horasTotal += parseInt(hours) + (parseInt(minutes) / 60);
            }
          }
          finishedAt = adicionarTempo(startedAt, horasTotal);
        }

        const trailResult = await client.query(
          `INSERT INTO trails 
          ("user", "startedAt", "finishedAt", modality, "inversePaths", created_at, updated_at) 
          VALUES ($1, $2, $3, $4, $5, NOW(), NOW()) 
          RETURNING id`,
          [userId, startedAt, finishedAt, modality, inversePaths]
        );
        const trailId = trailResult.rows[0].id;
        trailsCreated++;

        // Criar TRAIL-ROUTES para cada trecho percorrido
        let currentTime = new Date(startedAt);
        
        for (let t = 0; t < numTrechos; t++) {
          const trailPartIndex = inversePaths ? (trailParts.length - 1 - t) : t;
          
          if (trailPartIndex >= 0 && trailPartIndex < trailParts.length) {
            const trailPart = trailParts[trailPartIndex];
            const [hours, minutes] = trailPart.time.split(':');
            const duracaoHoras = parseInt(hours) + (parseInt(minutes) / 60);
            
            const fromCP = checkpointsMap[trailPart.fromCheckpoint];
            const toCP = checkpointsMap[trailPart.toCheckpoint];
            
            // Gerar caminho GPS com timestamps corretos
            const trackedPath = fromCP && toCP ? gerarTrackedPath(fromCP, toCP, currentTime, duracaoHoras) : null;
            
            // Para trilhas em andamento, último trecho não tem finishedAt
            const isLastRoute = (t === numTrechos - 1);
            const routeFinishedAt = (!finalizada && isLastRoute) ? null : adicionarTempo(currentTime, duracaoHoras);
            
            // Se a rota não foi finalizada, ela fica como DRAFT (published_at = NULL)
            const publishedAt = routeFinishedAt ? 'NOW()' : 'NULL';
            
            await client.query(
              `INSERT INTO trail_routes 
              (trail, route, "finishedAt", "trackedPath", published_at, created_at, updated_at) 
              VALUES ($1, $2, $3, $4, ${publishedAt}, NOW(), NOW())`,
              [trailId, trailPart.id, routeFinishedAt, trackedPath]
            );
            routesCreated++;
            
            if (routeFinishedAt) {
              currentTime = new Date(routeFinishedAt);
            }
          }
        }

        // Criar CERTIFICATE para trilhas finalizadas (completas ou parciais)
        if (finalizada) {
          const code = gerarCodigoCertificado();
          const isComplete = numTrechos === 13;
          const tipoCertificado = isComplete ? 'Completo' : 'Parcial';
          
          // Calcular distância percorrida
          let distanciaTotal = 0;
          for (let t = 0; t < numTrechos; t++) {
            const trailPartIndex = inversePaths ? (trailParts.length - 1 - t) : t;
            if (trailPartIndex >= 0 && trailPartIndex < trailParts.length) {
              distanciaTotal += parseFloat(trailParts[trailPartIndex].distance);
            }
          }
          
          const certificateHtml = `
            <div style="text-align: center; padding: 40px; font-family: Arial, sans-serif;">
              <h1>Certificado de Conclusão ${tipoCertificado}</h1>
              <h2>Caminho de Cora Coralina</h2>
              <p>Certificamos que o participante completou com sucesso ${isComplete ? 'a trilha completa' : 'parte da trilha'}</p>
              <p><strong>Trechos Percorridos:</strong> ${numTrechos} de 13</p>
              <p><strong>Modalidade:</strong> ${modality === 'foot' ? 'A pé' : 'Bicicleta'}</p>
              <p><strong>Distância Percorrida:</strong> ${distanciaTotal.toFixed(1)} km</p>
              ${isComplete ? '<p><strong>Distância Total:</strong> 297.6 km (100%)</p>' : `<p><strong>Percentual Concluído:</strong> ${((distanciaTotal / 297.6) * 100).toFixed(1)}%</p>`}
              <p><strong>Data de Conclusão:</strong> ${finishedAt.toLocaleDateString('pt-BR')}</p>
              <p><strong>Código de Verificação:</strong> ${code}</p>
            </div>
          `;

          await client.query(
            `INSERT INTO certificates (code, trail, file, created_at, updated_at) 
             VALUES ($1, $2, $3, NOW(), NOW())`,
            [code, trailId, certificateHtml]
          );
          certificatesCreated++;
        }
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Seed de trilhas concluído com sucesso!');
    console.log('\n📊 Resumo:');
    console.log(`  • ${trailsCreated} trilhas criadas`);
    console.log(`  • ${routesCreated} rotas/trechos percorridos`);
    console.log(`  • ${certificatesCreated} certificados emitidos`);
    console.log('\n📋 Distribuição:');
    scenarios.forEach(s => {
      console.log(`  • ${s.descricao}: ${s.usuarios} usuários`);
    });
    console.log('\n🌐 Acesse: http://localhost:1337/admin');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error(error);
  } finally {
    await client.end();
  }
}

seedTrailsAndRoutes();
