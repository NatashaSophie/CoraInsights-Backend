'use strict';

const bcrypt = require('bcryptjs');

/**
 * An asynchronous bootstrap function that runs before
 * your application gets started.
 *
 * This gives you an opportunity to set up your data model,
 * run jobs, or perform some special logic.
 *
 * See more details here: https://strapi.io/documentation/developer-docs/latest/setup-deployment-guides/configurations.html#bootstrap
 */

module.exports = async () => {
  // Registrar rotas customizadas de autenticação
  console.log('[BOOTSTRAP] Registering auth routes...');

  // Middleware para rota POST /api/auth/login
  strapi.router.post('/api/auth/login', async (ctx, next) => {
    console.log('[AUTH ROUTE] ========== LOGIN REQUEST RECEIVED ==========');
    console.log('[AUTH ROUTE] Method:', ctx.method);
    console.log('[AUTH ROUTE] URL:', ctx.url);
    console.log('[AUTH ROUTE] Headers:', ctx.headers);
    console.log('[AUTH ROUTE] Request body:', ctx.request.body);
    console.log('[AUTH ROUTE] Raw body:', ctx.body);
    
    // Tentar parsear o body manualmente se necessário
    let identifier, password;
    
    if (ctx.request.body && typeof ctx.request.body === 'object') {
      identifier = ctx.request.body.identifier;
      password = ctx.request.body.password;
    } else if (typeof ctx.request.body === 'string') {
      try {
        const parsed = JSON.parse(ctx.request.body);
        identifier = parsed.identifier;
        password = parsed.password;
      } catch (e) {
        console.log('[AUTH] Error parsing body:', e.message);
      }
    }

    console.log('[AUTH] Parsed identifier:', identifier);
    console.log('[AUTH] Parsed password:', password);

    if (!identifier || !password) {
      console.log('[AUTH] Missing credentials - returning 400');
      ctx.status = 400;
      ctx.body = { error: 'identifier and password are required' };
      return;
    }

    try {
      console.log('[AUTH] Login attempt for:', identifier, 'with password:', password);
      
      let user = null;
      
      try {
        console.log('[AUTH] Querying database for email:', identifier);
        
        // Query SQL direta na tabela users-permissions_user
        const result = await strapi.connections.default.raw(
          'SELECT id, email, username, password, role FROM "users-permissions_user" WHERE email = ? LIMIT 1',
          [identifier]
        );
        
        console.log('[AUTH] Query result:', result);
        
        user = result.rows && result.rows.length > 0 ? result.rows[0] : null;
        
        if (user) {
          console.log('[AUTH] User found:', user.email, 'with role:', user.role);
        }
      } catch (e) {
        console.log('[AUTH] Database query error:', e.message);
        console.error('[AUTH] Full error:', e);
        ctx.status = 401;
        ctx.body = { error: 'Invalid credentials' };
        return;
      }

      if (!user) {
        console.log('[AUTH] No user found for:', identifier);
        ctx.status = 401;
        ctx.body = { error: 'Invalid credentials' };
        return;
      }

      // User já vem do resultado da query SQL
      const userData = user;

      console.log('[AUTH] Comparing passwords:');
      console.log('[AUTH] Provided password:', password, 'Type:', typeof password);
      console.log('[AUTH] DB password hash:', userData.password, 'Type:', typeof userData.password);
      
      // Comparar senha com bcrypt
      const passwordMatch = await bcrypt.compare(password, userData.password);
      console.log('[AUTH] Password match:', passwordMatch);

      if (!passwordMatch) {
        console.log('[AUTH] Invalid password for:', identifier);
        ctx.status = 401;
        ctx.body = { error: 'Invalid credentials' };
        return;
      }

      // role é um ID numérico, precisamos validar se é um role permitido
      // Roles no Strapi users-permissions: 1 = Authenticated, 2 = Public, etc
      // Precisamos buscar qual é o ID da role do usuário
      console.log('[AUTH] User role ID:', userData.role);
      
      // Por enquanto, vamos aceitar qualquer role que não seja Public (geralmente ID 2)
      // Depois ajustamos conforme o seu padrão de roles
      const allowedRoleIds = [1, 3, 4, 5]; // IDs de roles permitidas (pilgrim, manager, merchant)
      
      if (!allowedRoleIds.includes(userData.role)) {
        console.log('[AUTH] Unauthorized role ID for:', identifier, 'role ID:', userData.role);
        ctx.status = 403;
        ctx.body = { error: 'Only authorized users can access the dashboard' };
        return;
      }

      console.log('[AUTH] Login successful for:', identifier, 'with role ID:', userData.role);

      ctx.status = 200;
      ctx.body = {
        jwt: 'mock-jwt-token-' + userData.id,
        user: {
          id: userData.id,
          email: userData.email,
          username: userData.username || userData.email,
          userType: userData.role || 'user'
        }
      };
      console.log('[AUTH] Returning success response');
    } catch (error) {
      console.error('[AUTH] Login error:', error);
      ctx.status = 500;
      ctx.body = { error: 'Failed to login' };
    }
  });

  // Middleware para rota GET /api/auth/validate
  strapi.router.get('/api/auth/validate', async (ctx, next) => {
    console.log('[AUTH ROUTE] Validate request received');
    
    const token = ctx.get('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      ctx.status = 401;
      ctx.body = { error: 'No token provided' };
      return;
    }

    if (token && token.startsWith('mock-jwt-token')) {
      ctx.status = 200;
      ctx.body = { valid: true };
    } else {
      ctx.status = 401;
      ctx.body = { error: 'Invalid token' };
    }
  });
  
  console.log('[BOOTSTRAP] Auth routes registered successfully');
};
