/**
 * Analytics Routes
 * Define as rotas para os endpoints de analytics
 */

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/analytics/pilgrim',
      handler: 'analytics.getPilgrimAnalytics',
      config: {
        auth: true, // Requer autenticação
        policies: []
      }
    },
    {
      method: 'GET',
      path: '/analytics/manager',
      handler: 'analytics.getManagerAnalytics',
      config: {
        auth: true, // Requer autenticação
        policies: []
      }
    },
    {
      method: 'GET',
      path: '/analytics/merchant',
      handler: 'analytics.getMerchantAnalytics',
      config: {
        auth: true, // Requer autenticação
        policies: []
      }
    }
  ]
};
