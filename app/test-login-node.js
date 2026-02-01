// Testar login através do servidor Strapi em execução
const http = require('http');

const postData = JSON.stringify({
  identifier: 'adriana.carvalho.freitas266@email.com',
  password: 'Dri@123'
});

const options = {
  hostname: 'localhost',
  port: 1337,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('Status:', res.statusCode);
    try {
      const response = JSON.parse(data);
      console.log('\nResponse:');
      console.log('  JWT:', response.jwt);
      console.log('  User:');
      console.log('    ID:', response.user.id);
      console.log('    Email:', response.user.email);
      console.log('    Username:', response.user.username);
      console.log('    UserType:', response.user.userType);
    } catch (e) {
      console.log('Response:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('Error:', error);
});

req.write(postData);
req.end();
