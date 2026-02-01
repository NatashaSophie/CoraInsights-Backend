#!/usr/bin/env node

const http = require('http');

function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 1337,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

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
  console.log('Testando login para Peregrino...\n');
  
  try {
    const result = await makeRequest('POST', '/auth/login', {
      identifier: 'peregrino@cora.com',
      password: 'peregrino123'
    });
    
    console.log('Status:', result.status);
    console.log('Response:', result.data);
    
    if (result.status === 200) {
      const userData = JSON.parse(result.data);
      console.log('\n✅ Login bem-sucedido!');
      console.log('JWT Token:', userData.jwt.substring(0, 50) + '...');
      console.log('User:', userData.user);
      
      // Testar analytics com o token
      console.log('\n\nTestando analytics do Peregrino...\n');
      const analyticsResult = await makeRequest('GET', '/analytics/pilgrim', null);
      // Adicionar header manualmente
      
      const analyticsOptions = {
        hostname: 'localhost',
        port: 1337,
        path: '/analytics/pilgrim',
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${userData.jwt}`,
          'Content-Type': 'application/json'
        }
      };
      
      const analyticsReq = http.request(analyticsOptions, (res) => {
        let responseData = '';
        res.on('data', chunk => responseData += chunk);
        res.on('end', () => {
          console.log('Status:', res.statusCode);
          console.log('Response:', responseData);
        });
      });
      
      analyticsReq.on('error', console.error);
      analyticsReq.end();
    }
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

test();
