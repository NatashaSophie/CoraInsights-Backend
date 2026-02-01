const parse = require("pg-connection-string").parse;

module.exports = ({ env }) => ({
  defaultConnection: "default",
  connections: {
    default: {
      connector: "bookshelf",
      settings: {
        url: env('PUBLIC_URL', 'localhost'),
        host: env('DATABASE_HOST', '0.0.0.0'),
        client: env('DATABASE_CLIENT', 'postgres'),
        port: env.int('DATABASE_PORT', 5432),
        database: env('DATABASE_NAME', 'strapi'),
        username: env('DATABASE_USERNAME', 'strapi'),
        password: env('DATABASE_PASSWORD', 'strapi'),
        ssl: env.bool('DATABASE_SSL', false),
        // ssl: {
        //   rejectUnauthorized: false,
        // },
      },
      options: {
        ssl: env.bool('DATABASE_SSL_SELF', false),
      },
    },
  },
});
