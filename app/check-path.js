const knex = require('knex')({
  client: 'pg',
  connection: { host: 'localhost', port: 5432, user: 'postgres', password: 'postgres', database: 'strapi' }
});
async function check() {
  const r = await knex.raw('SELECT id, \"trackedPath\" FROM trail_routes WHERE \"finishedAt\" IS NOT NULL LIMIT 1');
  const path = r.rows[0].trackedPath;
  console.log('Total points:', path.length);
  console.log('First point:', path[0]);
  console.log('Last point:', path[path.length-1]);
  const startTime = path[0].timestamp;
  const endTime = path[path.length-1].timestamp;
  console.log('Duration (hours):', (endTime - startTime) / 1000 / 3600);
  process.exit();
}
check();
