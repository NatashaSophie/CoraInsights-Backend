const {Pool} = require('pg');
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'postgres',
  database: 'strapi'
});

pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE '%user%'")
  .then(r => {
    console.log('Tabelas user:', r.rows.map(x => x.table_name));
    pool.end();
  });
