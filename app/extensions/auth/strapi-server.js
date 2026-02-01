'use strict';

module.exports = async (strapi) => {
  // Registrar hook customizado para auth
  strapi.server.routes([
    {
      method: 'POST',
      path: '/auth/login',
      handler: async (ctx) => {
        const { identifier, password } = ctx.request.body;

        if (!identifier || !password) {
          ctx.badRequest('identifier and password are required');
          return;
        }

        try {
          console.log('[AUTH] Login attempt for:', identifier);
          
          let user = null;
          
          try {
            const result = await strapi.db.connection.raw(
              'SELECT id, email, username, password, userType FROM up_users WHERE email = ? LIMIT 1',
              [identifier]
            );
            
            user = result.rows && result.rows.length > 0 ? result.rows[0] : result[0];
            console.log('[AUTH] User found:', user ? user.email : 'none');
          } catch (e) {
            console.log('[AUTH] Database query error:', e.message);
            ctx.unauthorized('Invalid credentials');
            return;
          }

          if (!user) {
            console.log('[AUTH] No user found for:', identifier);
            ctx.unauthorized('Invalid credentials');
            return;
          }

          if (user.password !== password) {
            console.log('[AUTH] Invalid password for:', identifier);
            ctx.unauthorized('Invalid credentials');
            return;
          }

          const allowedRoles = ['pilgrim', 'manager', 'merchant'];
          const userRole = (user.userType || '').toLowerCase();
          
          if (!allowedRoles.includes(userRole)) {
            console.log('[AUTH] Unauthorized userType for:', identifier, 'userType:', userRole);
            ctx.forbidden('Only pilgrim, manager and merchant users can access the dashboard');
            return;
          }

          console.log('[AUTH] Login successful for:', identifier, 'with userType:', user.userType);

          ctx.send({
            jwt: 'mock-jwt-token-' + user.id,
            user: {
              id: user.id,
              email: user.email,
              username: user.username || user.email,
              userType: user.userType || 'user'
            }
          });
        } catch (error) {
          console.error('[AUTH] Login error:', error);
          ctx.internalServerError('Failed to login');
        }
      }
    },
    {
      method: 'GET',
      path: '/auth/validate',
      handler: async (ctx) => {
        const token = ctx.get('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
          ctx.unauthorized('No token provided');
          return;
        }

        if (token && token.startsWith('mock-jwt-token')) {
          ctx.send({ valid: true });
        } else {
          ctx.unauthorized('Invalid token');
        }
      }
    }
  ]);
};
