const http = require('http');

const testAPI = (id) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: '127.0.0.1',
      port: 1337,
      path: `/trail-routes/${id}`,
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`Status: ${res.statusCode}`);
        console.log(`Headers:`, res.headers);
        
        if (res.statusCode === 200) {
          try {
            const json = JSON.parse(data);
            console.log(`✅ Sucesso! TrackPath com ${json.trackedPath ? json.trackedPath.length : 0} pontos`);
          } catch (e) {
            console.log('❌ Erro ao parsear JSON');
          }
        } else {
          console.log('❌ Resposta:', data.substring(0, 200));
        }
        resolve();
      });
    });

    req.on('error', (e) => {
      console.error('❌ Erro na requisição:', e.message);
      reject(e);
    });

    req.end();
  });
};

console.log('🧪 Testando API...\n');
testAPI(506);
