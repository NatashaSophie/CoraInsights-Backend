/**
 * Middleware para permitir acesso público ao endpoint /dashboards/public
 * Este hook é carregado automaticamente pelo Strapi
 */

'use strict';

module.exports = strapi => {
  return {
    initialize() {
      // Middleware para permitir acesso público a endpoints específicos
      strapi.app.use(async (ctx, next) => {
        const isPublicDashboardRoute =
          (ctx.path === '/dashboards/public' && ctx.method === 'GET') ||
          (ctx.path === '/dashboards/auth/login' && ctx.method === 'POST') ||
          (ctx.path === '/dashboards/analytics/pilgrim' && ctx.method === 'GET') ||
          (ctx.path === '/dashboards/analytics/manager' && ctx.method === 'GET') ||
          (ctx.path === '/dashboards/analytics/merchant' && ctx.method === 'GET');

        if (isPublicDashboardRoute) {
          // Marcar como público para pular validações de permissão
          ctx.state.isPublic = true;
        }
        await next();
      });
    },
  };
};
