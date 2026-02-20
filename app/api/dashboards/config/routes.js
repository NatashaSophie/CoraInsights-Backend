module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/dashboards/auth/login',
      handler: 'dashboards.login',
      config: {
        auth: false,
        policies: []
      }
    },
    {
      method: 'GET',
      path: '/dashboards/analytics/pilgrim',
      handler: 'dashboards.getPilgrimAnalytics',
      config: {
        auth: false,
        policies: []
      }
    },
    {
      method: 'GET',
      path: '/dashboards/analytics/manager',
      handler: 'dashboards.getManagerAnalytics',
      config: {
        auth: false,
        policies: []
      }
    },
    {
      method: 'GET',
      path: '/dashboards/analytics/merchant',
      handler: 'dashboards.getMerchantAnalytics',
      config: {
        auth: false,
        policies: []
      }
    },
    {
      method: 'GET',
      path: '/dashboards/public',
      handler: 'dashboards.getPublicData',
      config: {
        auth: false
      }
    }
  ]
};
