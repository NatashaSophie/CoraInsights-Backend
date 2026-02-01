#!/usr/bin/env node

const http = require('http');

function makeRequest(method, path, data = null, token = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: '127.0.0.1',  // Usar IP explícito ao invés de localhost
      port: 1337,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let responseData = '';
      res.on('data', chunk => responseData += chunk);
      res.on('end', () => {
        resolve({ status: res.statusCode, data: responseData });
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function test() {
  const users = [
    { email: 'peregrino@cora.com', password: 'peregrino123', type: 'PILGRIM', endpoint: '/analytics/pilgrim' },
    { email: 'gestor@cora.com', password: 'gestor123', type: 'MANAGER', endpoint: '/analytics/manager' },
    { email: 'comerciante@cora.com', password: 'comerciante123', type: 'MERCHANT', endpoint: '/analytics/merchant' }
  ];
  
  for (const user of users) {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`Testando ${user.type}`);
    console.log(`${'='.repeat(50)}\n`);
    
    try {
      console.log(`1. Login como ${user.email}...`);
      const loginResult = await makeRequest('POST', '/auth/login', {
        identifier: user.email,
        password: user.password
      });
      
      if (loginResult.status !== 200) {
        console.log(`❌ Erro no login: ${loginResult.status}`);
        console.log('Response:', loginResult.data);
        continue;
      }
      
      const userData = JSON.parse(loginResult.data);
      const token = userData.jwt;
      
      console.log(`✅ Login bem-sucedido`);
      console.log(`   User ID: ${userData.user.id}`);
      console.log(`   UserType: ${userData.user.userType}`);
      console.log(`   Token: ${token.substring(0, 40)}...`);
      
      // Testar analytics
      console.log(`\n2. Buscando dados do ${user.type}...`);
      let analyticsPath = user.endpoint;
      if (user.type === 'MERCHANT') {
        analyticsPath += '?merchantId=1&start=2024-01-01&end=2024-12-31';
      } else {
        analyticsPath += '?start=2024-01-01&end=2024-12-31';
      }
      
      const analyticsResult = await makeRequest('GET', analyticsPath, null, token);
      
      if (analyticsResult.status !== 200) {
        console.log(`❌ Erro ao buscar analytics: ${analyticsResult.status}`);
        console.log('Response:', analyticsResult.data.substring(0, 200));
        continue;
      }
      
      const analyticsData = JSON.parse(analyticsResult.data);
      console.log(`✅ Analytics buscados com sucesso`);
      console.log(`   Dados:`, JSON.stringify(analyticsData, null, 2).substring(0, 300) + '...');
      
    } catch (error) {
      console.log(`❌ Erro: ${error.message}`);
    }
  }
  
  console.log(`\n${'='.repeat(50)}`);
  console.log('Testes concluídos!');
  console.log(`${'='.repeat(50)}\n`);
}

test();
