'use strict';

/**
 * A set of functions called "actions" for `auth`
 */

module.exports = {
  async login(ctx) {
    const { identifier, password } = ctx.request.body;

    if (!identifier || !password) {
      return ctx.badRequest('identifier and password are required');
    }

    try {
      // Buscar usuário pelo email na tabela de usuários do Strapi
      // Tentar usar a API do Strapi primeiro
      let user = null;
      
      try {
        // Tentar acessar via query do Strapi
        user = await strapi.query('plugin::users-permissions.user').findOne({
          where: { email: identifier }
        });
      } catch (e) {
        console.log('Query method 1 failed, trying method 2:', e.message);
        
        // Fallback: tentar query raw direto no banco
        try {
          const result = await strapi.db.connection.raw(
            'SELECT * FROM up_users WHERE email = ? LIMIT 1',
            [identifier]
          );
          user = result.rows[0] || result[0];
        } catch (e2) {
          console.log('Query method 2 failed, trying method 3:', e2.message);
          
          // Fallback final: usar query simples
          user = await strapi.entityService.findMany('plugin::users-permissions.user', {
            filters: { email: identifier },
            limit: 1
          });
          user = user && user.length > 0 ? user[0] : null;
        }
      }

      if (!user) {
        ctx.unauthorized('Invalid credentials');
        return;
      }

      // Validar senha (simples comparação, em produção usar bcrypt)
      if (user.password !== password) {
        ctx.unauthorized('Invalid credentials');
        return;
      }

      // Retornar dados do usuário
      ctx.send({
        jwt: 'mock-jwt-token-' + user.id,
        user: {
          id: user.id,
          email: user.email,
          username: user.username || user.email,
          role: {
            type: user.role?.name || user.role || 'user'
          }
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      ctx.internalServerError('Failed to login');
    }
  },

  async validate(ctx) {
    // Validate a JWT token
    const token = ctx.get('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      ctx.unauthorized('No token provided');
      return;
    }

    // Para setup mock, apenas verifica se não está vazio
    if (token && token.startsWith('mock-jwt-token')) {
      ctx.send({ valid: true });
    } else {
      ctx.unauthorized('Invalid token');
    }
  }
};
