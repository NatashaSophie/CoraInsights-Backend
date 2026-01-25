const fs = require('fs');
const path = require('path');

// Carrega as coordenadas extraídas do KML
const coordinates = require('./route-coordinates.json');

console.log(`📍 Carregadas ${coordinates.length} coordenadas do traçado real`);

// Função de conversão UTM para Lat/Lon (ponto de referência: Corumbá de Goiás)
function utmToLatLon(x, y) {
  const xRef = 734787;  // UTM E de Corumbá de Goiás
  const yRef = 8238207; // UTM N de Corumbá de Goiás
  const latRef = -15.9255; // Latitude de Corumbá
  const lonRef = -48.8104; // Longitude de Corumbá
  
  // Conversão aproximada para graus
  const metrosPorGrauLat = 111320; // metros por grau de latitude
  const metrosPorGrauLon = 107550; // metros por grau de longitude (varia com a latitude, aproximado para -16°)
  
  const deltaX = x - xRef;
  const deltaY = y - yRef;
  
  const lat = latRef + (deltaY / metrosPorGrauLat);
  const lon = lonRef + (deltaX / metrosPorGrauLon);
  
  return { lat, lon };
}

// Função para calcular distância entre dois pontos (haversine)
function calcularDistancia(coord1, coord2) {
  const R = 6371000; // Raio da Terra em metros
  const phi1 = coord1.lat * Math.PI / 180;
  const phi2 = coord2.lat * Math.PI / 180;
  const deltaPhi = (coord2.lat - coord1.lat) * Math.PI / 180;
  const deltaLambda = (coord2.lon - coord1.lon) * Math.PI / 180;

  const a = Math.sin(deltaPhi/2) * Math.sin(deltaPhi/2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(deltaLambda/2) * Math.sin(deltaLambda/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
}

// Função para encontrar o índice da coordenada mais próxima de um ponto
function encontrarIndiceMaisProximo(lat, lon, inicioIdx = 0) {
  let menorDistancia = Infinity;
  let indiceMaisProximo = inicioIdx;

  for (let i = inicioIdx; i < coordinates.length; i++) {
    const dist = calcularDistancia({ lat, lon }, coordinates[i]);
    if (dist < menorDistancia) {
      menorDistancia = dist;
      indiceMaisProximo = i;
    }
  }

  return { indice: indiceMaisProximo, distancia: menorDistancia };
}

// Função para criar mapeamento de checkpoints do banco de dados
async function mapearCheckpointsFromDB(pool) {
  const result = await pool.query(`
    SELECT c.id, c.name, l.x, l.y
    FROM checkpoints c
    JOIN checkpoints_components cc ON c.id = cc.checkpoint_id
    JOIN components_general_locations l ON cc.component_id = l.id
    WHERE cc.component_type = 'components_general_locations'
    ORDER BY c.id
  `);

  console.log(`\n🔍 Mapeando ${result.rows.length} checkpoints do banco para o traçado real:`);
  const checkpointMapping = [];
  let ultimoIndice = 0;

  for (const row of result.rows) {
    // Converter UTM para Lat/Lon
    const { lat, lon } = utmToLatLon(row.x, row.y);
    const cp = { id: row.id, name: row.name, lat, lon };
    
    const resultado = encontrarIndiceMaisProximo(cp.lat, cp.lon, ultimoIndice);
    checkpointMapping.push({
      ...cp,
      indiceKML: resultado.indice,
      distanciaMetros: resultado.distancia
    });
    
    console.log(`  ${cp.name}: índice ${resultado.indice}, distância ${resultado.distancia.toFixed(0)}m`);
    ultimoIndice = resultado.indice;
  }

  return checkpointMapping;
}

// Checkpoints hardcoded (manter para compatibilidade, mas preferir mapearCheckpointsFromDB)
const checkpoints = [
  { id: 5, name: 'Corumbá de Goiás', lat: -15.9255, lon: -48.8104 },
  { id: 6, name: 'Fazenda Engenho D\'água', lat: -15.8418, lon: -48.7746 },
  { id: 7, name: 'Fazenda Vereda', lat: -15.7657, lon: -48.7922 },
  { id: 8, name: 'Ponte do rio das Almas', lat: -15.7398, lon: -48.8076 },
  { id: 9, name: 'Povoado de Lagolândia', lat: -15.8032, lon: -48.8937 },
  { id: 10, name: 'Posse da Fazenda Jardim', lat: -15.8529, lon: -48.9686 },
  { id: 11, name: 'Fazenda Santa Ana', lat: -15.9192, lon: -49.0255 },
  { id: 12, name: 'Fazenda Jacobina', lat: -15.9882, lon: -49.0324 },
  { id: 13, name: 'Povoado Coqueiro', lat: -16.0488, lon: -49.0665 },
  { id: 14, name: 'Fazenda Palmeira de Dona Ana', lat: -16.0805, lon: -49.1266 },
  { id: 15, name: 'Estrada das Araras', lat: -15.9923, lon: -49.2080 },
  { id: 16, name: 'Fazenda Canaã', lat: -15.8947, lon: -49.3423 },
  { id: 17, name: 'Fazenda Monjolinho', lat: -15.8712, lon: -49.4805 },
  { id: 18, name: 'Fazenda Colônia', lat: -15.9289, lon: -50.1389 }
];

// Mapear checkpoints para coordenadas do KML
console.log('\n🔍 Mapeando checkpoints para o traçado real:');
const checkpointMapping = [];
let ultimoIndice = 0;

for (const cp of checkpoints) {
  const resultado = encontrarIndiceMaisProximo(cp.lat, cp.lon, ultimoIndice);
  checkpointMapping.push({
    ...cp,
    indiceKML: resultado.indice,
    distanciaMetros: resultado.distancia
  });
  
  console.log(`  ${cp.name}: índice ${resultado.indice}, distância ${resultado.distancia.toFixed(0)}m`);
  ultimoIndice = resultado.indice;
}

// Função para extrair segmento do traçado entre dois checkpoints
function extrairSegmento(cpInicio, cpFim) {
  const idxInicio = cpInicio.indiceKML;
  const idxFim = cpFim.indiceKML;
  
  return coordinates.slice(idxInicio, idxFim + 1);
}

// Função para gerar trackedPath realista baseado no traçado real
// - Coleta pontos a intervalos de tempo (não quantidade fixa)
// - Segue o traçado real das coordenadas KML
// - Tempo de conclusão varia por usuário (fatorVelocidade)
function gerarTrackedPath(cpInicio, cpFim, startTime, duracaoHoras, fatorVelocidade = 1.0, intervaloColetaSegundos = 45) {
  const segmento = extrairSegmento(cpInicio, cpFim);
  
  if (segmento.length < 2) {
    console.warn(`⚠️ Segmento muito curto entre ${cpInicio.name} e ${cpFim.name}`);
    return JSON.stringify([]);
  }
  
  // Calcular distância total do segmento
  let distanciaTotal = 0;
  for (let i = 1; i < segmento.length; i++) {
    distanciaTotal += calcularDistancia(segmento[i-1], segmento[i]);
  }
  
  // Duração real varia com o fator de velocidade do usuário
  // fator < 1: mais rápido que a média
  // fator = 1: tempo médio estimado
  // fator > 1: mais lento que a média
  const duracaoRealHoras = duracaoHoras * fatorVelocidade;
  const duracaoMs = duracaoRealHoras * 3600000;
  
  // Quantos pontos coletar baseado na duração (não fixo!)
  const numPontos = Math.floor((duracaoRealHoras * 3600) / intervaloColetaSegundos);
  
  const path = [];
  const intervaloPontos = (segmento.length - 1) / numPontos;
  
  for (let i = 0; i <= numPontos; i++) {
    const progress = i / numPontos;
    const timestamp = startTime.getTime() + (progress * duracaoMs);
    
    // Interpolar entre pontos do KML (não linha reta!)
    const indiceFloat = i * intervaloPontos;
    const indiceBase = Math.floor(indiceFloat);
    const indiceTeto = Math.min(indiceBase + 1, segmento.length - 1);
    const fator = indiceFloat - indiceBase;
    
    const coord1 = segmento[indiceBase];
    const coord2 = segmento[indiceTeto];
    
    // Interpolação linear entre dois pontos consecutivos do KML
    const lat = coord1.lat + (coord2.lat - coord1.lat) * fator;
    const lon = coord1.lon + (coord2.lon - coord1.lon) * fator;
    
    // Adicionar variação pequena para simular imprecisão GPS (±5 metros)
    const variacaoLat = (Math.random() - 0.5) * 0.00009; // ~5m latitude
    const variacaoLon = (Math.random() - 0.5) * 0.00009; // ~5m longitude
    
    path.push({
      lat: lat + variacaoLat,
      lon: lon + variacaoLon,
      timestamp
    });
  }
  
  return JSON.stringify(path);
}

// Salvar mapeamento de checkpoints
const mappingPath = path.join(__dirname, 'checkpoint-mapping.json');
fs.writeFileSync(mappingPath, JSON.stringify(checkpointMapping, null, 2));
console.log(`\n💾 Mapeamento salvo em: ${mappingPath}`);

// Exportar funções
module.exports = {
  coordinates,
  checkpointMapping, // mapeamento hardcoded (deprecated)
  mapearCheckpointsFromDB, // PREFERIR ESTE
  gerarTrackedPath,
  extrairSegmento,
  calcularDistancia
};
