const knex = require('knex')({
  client: 'pg',
  connection: { host: 'localhost', port: 5432, user: 'postgres', password: 'postgres', database: 'strapi' }
});
knex.raw(SELECT column_name FROM information_schema.columns WHERE table_name = 'trail_routes').then(r => {
  console.log(r.rows.map(x => x.column_name));
  process.exit();
});
