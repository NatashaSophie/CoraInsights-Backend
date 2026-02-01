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
        // Permitir GET /dashboards/public sem autenticação
        if (ctx.path === '/dashboards/public' && ctx.method === 'GET') {
          ctx.state.isPublic = true;
        }
        await next();
      });
    },
  };
};
