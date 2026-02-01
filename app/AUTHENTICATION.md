# Autenticação - Caminho de Cora Backend

## Dois Tipos de Autenticação

### 1. Strapi Admin (`/admin`)
- **Usuários**: Apenas usuários com perfil **admin**
- **Localização**: `users-permissions_user` table (Strapi internal)
- **Autenticação**: Gerenciada internamente pelo Strapi
- **Acesso**: http://localhost:1337/admin

### 2. Dashboard (`/api/auth/login`)
- **Usuários**: Apenas usuários com perfis **pilgrim**, **manager**, **merchant**
- **Localização**: `up_users` table (tabela customizada)
- **Autenticação**: API REST em `/api/auth/login`
- **Roles Permitidos**: 
  - `pilgrim` (Peregrino) → DashboardPeregrino
  - `manager` (Gerente/Gestor) → DashboardGestor
  - `merchant` (Comerciante) → DashboardComerciant

## Endpoints de Autenticação

### POST /api/auth/login
Autentica um usuário para acessar os dashboards.

**Request:**
```json
{
  "identifier": "gestor@cora.com",
  "password": "Cora@123"
}
```

**Response (Sucesso - 200):**
```json
{
  "jwt": "mock-jwt-token-123",
  "user": {
    "id": 123,
    "email": "gestor@cora.com",
    "username": "gestor@cora.com",
    "role": {
      "type": "manager"
    }
  }
}
```

**Response (Erro - 401):**
```json
{
  "statusCode": 401,
  "error": "Unauthorized",
  "message": "Invalid credentials"
}
```

**Response (Erro - 403):**
```json
{
  "statusCode": 403,
  "error": "Forbidden",
  "message": "Only pilgrim, manager and merchant users can access the dashboard"
}
```

### GET /api/auth/validate
Valida um token JWT.

**Request Headers:**
```
Authorization: Bearer mock-jwt-token-123
```

**Response (Válido - 200):**
```json
{
  "valid": true
}
```

**Response (Inválido - 401):**
```json
{
  "statusCode": 401,
  "error": "Unauthorized",
  "message": "No token provided"
}
```

## Fluxo de Login no Frontend

1. Usuário entra email e senha na página de login (`/login`)
2. Frontend faz POST para `/api/auth/login`
3. Backend valida:
   - Email existe na `up_users` table
   - Senha está correta
   - Role está em `[pilgrim, manager, merchant]`
4. Se validado, retorna JWT e dados do usuário
5. Frontend armazena em localStorage
6. Redireciona para dashboard baseado no role

## Estrutura de Arquivos

```
app/
  api/
    auth/
      config/
        routes.json          ← Define as rotas
      controllers/
        auth.js             ← Implementa login e validate
      documentation/
        1.0.0/
          auth.json         ← Documentação auto-gerada
```

## Próximos Passos (Futuro)

- [ ] Implementar JWT real com assinatura
- [ ] Criptografar senhas no banco (bcrypt)
- [ ] Adicionar refresh tokens
- [ ] Implementar rate limiting
- [ ] Adicionar logs de auditoria
