module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/dashboards/public',
      handler: 'dashboards.getPublicData',
      config: {
        policies: []
      }
    }
  ]
};
