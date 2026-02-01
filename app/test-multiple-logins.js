#!/usr/bin/env node

// Script para verificar usuários no banco e seus roles

const http = require('http');

// Fazer uma requisição para testar o login com gestor@cora.com
const testUsers = [
  { email: 'gestor@cora.com', password: 'Cora@123' },
  { email: 'pilgrim@test.com', password: 'test' },
  { email: 'merchant@test.com', password: 'test' }
];

async function testLogin(email, password) {
  return new Promise((resolve) => {
    const data = JSON.stringify({
      identifier: email,
      password: password
    });

    const options = {
      hostname: 'localhost',
      port: 1337,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          resolve({
            email,
            status: res.statusCode,
            response: json
          });
        } catch (e) {
          resolve({
            email,
            status: res.statusCode,
            error: body
          });
        }
      });
    });

    req.on('error', (e) => {
      resolve({ email, error: e.message });
    });

    req.write(data);
    req.end();
  });
}

(async () => {
  console.log('Testando autenticação com diferentes usuários...\n');
  
  for (const user of testUsers) {
    const result = await testLogin(user.email, user.password);
    console.log(`Email: ${result.email}`);
    console.log(`Status: ${result.status}`);
    console.log(`Resultado:`, result.response || result.error);
    console.log('---\n');
  }
})();
