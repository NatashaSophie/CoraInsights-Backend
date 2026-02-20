/**
 * Configuração do Strapi para habilitar acesso público ao dashboard
 */

'use strict';

module.exports = (strapi) => {
  return {
    register() {
      // Registrar o hook
    },

    async bootstrap() {
      // Middleware para permitir acesso público
      strapi.server.app.use(async (ctx, next) => {
        const isPublicDashboardRoute =
          (ctx.path === '/dashboards/public' && ctx.method === 'GET') ||
          (ctx.path === '/dashboards/auth/login' && ctx.method === 'POST') ||
          (ctx.path === '/dashboards/analytics/pilgrim' && ctx.method === 'GET') ||
          (ctx.path === '/dashboards/analytics/manager' && ctx.method === 'GET') ||
          (ctx.path === '/dashboards/analytics/merchant' && ctx.method === 'GET');

        if (isPublicDashboardRoute) {
          ctx.state.isPublic = true;
        }
        await next();
      });
    },
  };
};
