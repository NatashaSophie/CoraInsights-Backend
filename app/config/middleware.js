module.exports = ({ env }) => [
  'strapi::errors',
  'strapi::security',
  'strapi::cors',
  'strapi::poweredBy',
  'strapi::logger',
  'strapi::query',
  'strapi::body',
  'strapi::favicon',
  'strapi::public',
  {
    name: 'custom-auth',
    config: {
      enabled: true,
    },
  },
  {
    resolve: './middlewares/custom-auth',
  },
];

