'use strict';

module.exports = async (strapi) => {
  // Registrar rotas customizadas de autenticação dinamicamente
  
  // Registrar rota POST /api/auth/login
  strapi.router.post('/api/auth/login', async (ctx) => {
    const { identifier, password } = ctx.request.body;

    if (!identifier || !password) {
      ctx.badRequest('identifier and password are required');
      return;
    }

    try {
      console.log('Login attempt for:', identifier);
      
      // Buscar usuário no banco
      let user = null;
      
      try {
        const result = await strapi.db.connection.raw(
          'SELECT id, email, username, password, role FROM up_users WHERE email = ? LIMIT 1',
          [identifier]
        );
        
        user = result.rows && result.rows.length > 0 ? result.rows[0] : result[0];
        console.log('User found:', user);
      } catch (e) {
        console.log('Query error:', e.message);
        ctx.unauthorized('Invalid credentials');
        return;
      }

      if (!user) {
        console.log('No user found for:', identifier);
        ctx.unauthorized('Invalid credentials');
        return;
      }

      // Validar senha
      if (user.password !== password) {
        console.log('Invalid password for:', identifier);
        ctx.unauthorized('Invalid credentials');
        return;
      }

      console.log('Login successful for:', identifier);

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
      console.error('Login error:', error);
      ctx.internalServerError('Failed to login');
    }
  });

  // Registrar rota GET /api/auth/validate
  strapi.router.get('/api/auth/validate', async (ctx) => {
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
  });

  console.log('Custom auth routes registered');
};
