#!/usr/bin/env node

const http = require('http');

const data = JSON.stringify({
  identifier: 'gestor@cora.com',
  password: 'Cora@123'
});

const options = {
  hostname: '127.0.0.1',
  port: 1337,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  console.log(`HEADERS:`, res.headers);
  res.setEncoding('utf8');
  
  let body = '';
  res.on('data', (chunk) => {
    body += chunk;
  });
  
  res.on('end', () => {
    console.log('BODY:', body);
  });
});

req.on('error', (e) => {
  console.error(`ERRO: ${e.message}`);
});

req.write(data);
req.end();
