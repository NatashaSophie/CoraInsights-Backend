const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'postgres',
  database: 'strapi'
});

async function checkCoords() {
  await client.connect();
  
  // Buscar Corumbá
  const corumba = await client.query(`
    SELECT c.id, c.name, l.x, l.y 
    FROM checkpoints c 
    JOIN checkpoints_components cc ON c.id=cc.checkpoint_id 
    JOIN components_general_locations l ON cc.component_id=l.id 
    WHERE c.name LIKE '%Corumb%' 
    ORDER BY c.id LIMIT 1
  `);
  
  console.log('\n📍 Checkpoint:', corumba.rows[0].name);
  console.log('UTM X (E):', corumba.rows[0].x);
  console.log('UTM Y (N):', corumba.rows[0].y);
  
  // Coordenadas reais de Corumbá de Goiás (da internet):
  console.log('\n🌍 Coordenadas REAIS de Corumbá de Goiás:');
  console.log('Latitude: -15.9255° (15°55\'32"S)');
  console.log('Longitude: -48.8104° (48°48\'37"W)');
  
  // Testar conversão
  const x = corumba.rows[0].x;
  const y = corumba.rows[0].y;
  
  // Conversão atual
  const xRef = 737000;
  const yRef = 8250000;
  const latRef = -15.5;
  const lonRef = -49.3;
  
  const metrosPorGrauLat = 111320;
  const metrosPorGrauLon = 107550;
  
  const deltaX = x - xRef;
  const deltaY = y - yRef;
  
  const lat = latRef + (deltaY / metrosPorGrauLat);
  const lon = lonRef + (deltaX / metrosPorGrauLon);
  
  console.log('\n🔧 Conversão ATUAL do código:');
  console.log('Latitude convertida:', lat.toFixed(6));
  console.log('Longitude convertida:', lon.toFixed(6));
  console.log('Diferença Lat:', (lat - (-15.9255)).toFixed(6), '°');
  console.log('Diferença Lon:', (lon - (-48.8104)).toFixed(6), '°');
  
  await client.end();
}

checkCoords();
