const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'postgres',
  database: 'strapi'
});

async function check() {
  await client.connect();
  const idResult = await client.query('SELECT id FROM trail_routes ORDER BY id LIMIT 1');
  const id = idResult.rows[0].id;
  console.log('Verificando ID:', id);
  
  const result = await client.query('SELECT id, "trackedPath" FROM trail_routes WHERE id=$1', [id]);
  const tp = result.rows[0].trackedPath;
  console.log('Primeiro ponto:', tp[0]);
  console.log('Último ponto:', tp[tp.length-1]);
  console.log('Total pontos:', tp.length);
  console.log('Lat está em Goiás?', tp[0].lat > -17 && tp[0].lat < -14);
  console.log('Lon está em Goiás?', tp[0].lon > -51 && tp[0].lon < -48);
  await client.end();
}

check();
