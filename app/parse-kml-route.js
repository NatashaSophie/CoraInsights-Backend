const fs = require('fs');
const { DOMParser } = require('xmldom');
const path = require('path');

// Lê o arquivo KML do frontend
const kmlPath = path.join(__dirname, '../../caminho-de-cora-frontend/src/resources/kml.ts');
const fileContent = fs.readFileSync(kmlPath, 'utf-8');

// Extrai o conteúdo do KML entre as backticks
const kmlMatch = fileContent.match(/const kmlText = `([\s\S]*?)`;/);
if (!kmlMatch) {
  console.error('❌ Não foi possível extrair o KML do arquivo');
  process.exit(1);
}

const kmlText = kmlMatch[1];

// Parse do KML
const parser = new DOMParser();
const kml = parser.parseFromString(kmlText, 'text/xml');

// Extrai coordenadas
const coordinatesElement = kml.getElementsByTagName('coordinates')[0];
if (!coordinatesElement) {
  console.error('❌ Elemento <coordinates> não encontrado no KML');
  process.exit(1);
}

const coordsText = coordinatesElement.textContent.trim();
const coordLines = coordsText.split('\n').map(line => line.trim()).filter(line => line);

const coordinates = coordLines.map(line => {
  const [lon, lat, elevation] = line.split(',').map(parseFloat);
  return { lon, lat, elevation };
});

console.log(`✅ Extraídas ${coordinates.length} coordenadas do KML`);
console.log(`📍 Primeira coordenada: lon=${coordinates[0].lon}, lat=${coordinates[0].lat}`);
console.log(`📍 Última coordenada: lon=${coordinates[coordinates.length-1].lon}, lat=${coordinates[coordinates.length-1].lat}`);

// Salva as coordenadas em JSON para uso posterior
const outputPath = path.join(__dirname, 'route-coordinates.json');
fs.writeFileSync(outputPath, JSON.stringify(coordinates, null, 2));
console.log(`💾 Coordenadas salvas em: ${outputPath}`);

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

// Calcula distância total da trilha
let distanciaTotal = 0;
for (let i = 1; i < coordinates.length; i++) {
  distanciaTotal += calcularDistancia(coordinates[i-1], coordinates[i]);
}

console.log(`📏 Distância total da trilha: ${(distanciaTotal / 1000).toFixed(2)} km`);

module.exports = { coordinates, calcularDistancia };
