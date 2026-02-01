module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/dashboards/public',
      handler: 'dashboards.getPublicData',
      config: {
        auth: false
      }
    },
    {
      method: 'POST',
      path: '/auth/login',
      handler: 'dashboards.login',
      config: {
        auth: false
      }
    },
    {
      method: 'GET',
      path: '/auth/validate',
      handler: 'dashboards.validate',
      config: {
        auth: false
      }
    }
  ]
};
