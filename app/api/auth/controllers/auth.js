'use strict';

module.exports = {
  async login(ctx) {
    const { identifier, password } = ctx.request.body;

    if (!identifier || !password) {
      return ctx.badRequest('identifier and password are required');
    }

    try {
      console.log('[AUTH] Login attempt for:', identifier);
      
      // Buscar usuário no banco
      let user = null;
      
      try {
        const result = await strapi.db.connection.raw(
          'SELECT id, email, username, password, role FROM up_users WHERE email = ? LIMIT 1',
          [identifier]
        );
        
        user = result.rows && result.rows.length > 0 ? result.rows[0] : result[0];
        console.log('[AUTH] User found:', user ? user.email : 'none');
      } catch (e) {
        console.log('[AUTH] Database query error:', e.message);
        return ctx.unauthorized('Invalid credentials');
      }

      if (!user) {
        console.log('[AUTH] No user found for:', identifier);
        return ctx.unauthorized('Invalid credentials');
      }

      // Validar senha
      if (user.password !== password) {
        console.log('[AUTH] Invalid password for:', identifier);
        return ctx.unauthorized('Invalid credentials');
      }

      console.log('[AUTH] Login successful for:', identifier, 'with role:', user.role);

      // Retornar dados do usuário
      ctx.send({
        jwt: 'mock-jwt-token-' + user.id,
        user: {
          id: user.id,
          email: user.email,
          username: user.username || user.email,
          role: {
            type: user.role || 'user'
          }
        }
      });
    } catch (error) {
      console.error('[AUTH] Login error:', error);
      ctx.internalServerError('Failed to login');
    }
  },

  async validate(ctx) {
    const token = ctx.get('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return ctx.unauthorized('No token provided');
    }

    if (token && token.startsWith('mock-jwt-token')) {
      ctx.send({ valid: true });
    } else {
      ctx.unauthorized('Invalid token');
    }
  }
};
