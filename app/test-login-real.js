#!/usr/bin/env node

const http = require('http');

const data = JSON.stringify({
  identifier: 'gestor@cora.com',
  password: 'Cora@123'
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

console.log('Testando POST /api/auth/login com credenciais...\n');

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}\n`);
  res.setEncoding('utf8');
  
  let body = '';
  res.on('data', (chunk) => {
    body += chunk;
  });
  
  res.on('end', () => {
    try {
      const json = JSON.parse(body);
      console.log('RESPOSTA:');
      console.log(JSON.stringify(json, null, 2));
    } catch (e) {
      console.log('RESPOSTA (texto):');
      console.log(body);
    }
  });
});

req.on('error', (e) => {
  console.error(`ERRO: ${e.message}`);
});

req.write(data);
req.end();
