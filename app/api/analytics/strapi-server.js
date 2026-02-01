/**
 * Strapi Server Hook para Analytics
 * Registra as rotas manualmente no Strapi
 */

'use strict';

module.exports = (strapi) => {
  return {
    register() {
      // Registrar rotas customizadas
    },

    async bootstrap() {
      // Registrar as rotas de analytics dinamicamente
      const analyticsController = require('./controllers/analytics');
      
      strapi.api.analytics.controllers.analytics = analyticsController;
    },
  };
};
