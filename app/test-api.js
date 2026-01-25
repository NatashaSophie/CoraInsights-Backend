const http = require('http');

const options = {
  hostname: '127.0.0.1',
  port: 1337,
  path: '/trail-routes/506',
  method: 'GET',
};

console.log('🧪 Testando API...\n');

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log('\n✅ API funcionando!');
      console.log(`TrackPath pontos: ${json.trackedPath ? json.trackedPath.length : 'NENHUM'}`);
      console.log(`Primeiro ponto:`, json.trackedPath ? json.trackedPath[0] : 'N/A');
    } catch (e) {
      console.error('\n❌ Erro ao parsear JSON:', e.message);
      console.log('Resposta:', data.substring(0, 500));
    }
  });
});

req.on('error', (e) => {
  console.error('❌ Erro na requisição:', e.message);
});

req.end();
