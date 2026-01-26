const knex = require('knex')({
  client: 'pg',
  connection: { host: 'localhost', port: 5432, user: 'postgres', password: 'postgres', database: 'strapi' }
});
async function check() {
  const r = await knex.raw('SELECT id, \"finishedAt\", created_at FROM trail_routes WHERE \"finishedAt\" IS NOT NULL LIMIT 5');
  console.log(JSON.stringify(r.rows, null, 2));
  process.exit();
}
check();
