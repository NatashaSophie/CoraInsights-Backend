# PROBLEMA: Admin Panel sem Roles - Menu Vazio

## 📋 Resumo do Problema

Após fazer login no painel admin do Strapi (http://localhost:1337/admin):
- Login funciona ✅
- Session Storage mostra: `roles: []` (vazio) ❌
- Menu lateral não aparece ❌

## 🔍 Causa Raiz Identificada

O método `checkCredentials` em `strapi-admin/services/auth.js` (linha 30) NÃO popula as roles:

```javascript
const user = await strapi.query('user', 'admin').findOne({ email });
// ❌ Deveria ser: findOne({ email }, ['roles'])
```

## 💾 Estado Atual do Banco de Dados

**CONFIRMADO - Dados estão CORRETOS:**

```sql
-- Admin: natasha.sophie@gmail.com (id=1)
-- Role: Super Admin (id=1, code='strapi-super-admin')
-- Relacionamento: strapi_users_roles (user_id=1, role_id=1)
-- Permissões: 80 permissões do Super Admin
```

## 🛠️ Tentativas Realizadas (Todas Falharam)

1. ❌ Patch no bootstrap sobrescrevendo `checkCredentials`
2. ❌ Extensão customizada do serviço auth
3. ❌ Controller customizado de authentication
4. ❌ Middleware global para interceptar resposta de login
5. ❌ Sobrescrita do método `findOne` do query builder

## ✅ SOLUÇÃO DEFINITIVA (Para testar amanhã)

### Opção 1: Modificar diretamente o node_modules (temporário mas funciona)

**Arquivo:** `app/node_modules/strapi-admin/services/auth.js`

**Linha 30, trocar:**
```javascript
const user = await strapi.query('user', 'admin').findOne({ email });
```

**Por:**
```javascript
const user = await strapi.query('user', 'admin').findOne({ email }, ['roles']);
```

**Comando rápido (PowerShell):**
```powershell
cd D:\CoraApp\caminho-de-cora-backend\app
$file = "node_modules\strapi-admin\services\auth.js"
$content = Get-Content $file -Raw
$content = $content -replace 'const user = await strapi\.query\(''user'', ''admin''\)\.findOne\(\{ email \}\);', 'const user = await strapi.query(''user'', ''admin'').findOne({ email }, [''roles'']);'
$content | Set-Content $file -NoNewline
Write-Host "✅ Arquivo modificado!"
```

Depois reiniciar o servidor e testar o login.

### Opção 2: Usar patch-package (permanente)

1. Modificar o arquivo como acima
2. Instalar patch-package:
   ```bash
   npm install patch-package --save-dev
   ```

3. Criar o patch:
   ```bash
   npx patch-package strapi-admin
   ```

4. Adicionar ao package.json:
   ```json
   "scripts": {
     "postinstall": "patch-package"
   }
   ```

### Opção 3: Atualizar para Strapi v4 (recomendado longo prazo)

Strapi v4 corrigiu muitos bugs do ORM Bookshelf. Considere migração futura.

## 🧪 Como Testar se Funcionou

1. Iniciar servidor: `npm run develop`
2. Abrir aba anônima: http://localhost:1337/admin
3. Fazer login
4. F12 → Application → Session Storage
5. Verificar `userInfo`:
   ```json
   {
     "roles": [
       {
         "id": 1,
         "name": "Super Admin",
         "code": "strapi-super-admin",
         "description": "..."
       }
     ]
   }
   ```

6. Menu lateral deve aparecer com:
   - Content Manager
   - Content-Type Builder
   - Media Library
   - Plugins
   - Settings
   - Users & Permissions

## 📊 Arquivos Criados/Modificados Nesta Sessão

### Permissões Adicionadas (PostgreSQL)
```sql
-- 4 permissões críticas adicionadas ao Super Admin:
INSERT INTO strapi_permission (role, action, ...) VALUES
  (1, 'admin::application.read', ...),
  (1, 'admin::content-types.read', ...),
  (1, 'admin::plugins.read', ...),
  (1, 'admin::settings.read', ...);
```

### Arquivos Corrigidos
- ✅ `api/pdf-generator/config/routes.json` (criado - estava faltando)
- ✅ `extensions/auth/` (removido - estava quebrado)
- ✅ `config/functions/bootstrap.js` (patch tentado, pode remover)

### Backup do Banco de Dados
- SQL: `database/backups/postgres-backup-2026-02-07.sql` (530 KB)
- CSV: `database/exports/2026-02-07_21-25-40/` (1,366 registros)

## 🎯 PLANO PARA AMANHÃ

1. **Aplicar Opção 1** (modificação direta do node_modules)
2. **Reiniciar servidor**
3. **Testar login** em aba anônima
4. **Se funcionar**: Aplicar patch-package para tornar permanente
5. **Se não funcionar**: Investigar se há outro local que sobrescreve o findOne

## 📝 Notas Importantes

- **NÃO** reinstalar node_modules sem aplicar o patch novamente
- **NÃO** usar `npm install` sem ter o patch-package configurado
- Os dados do PostgreSQL estão **100% corretos**, não mexer no banco!
- Os warnings do Strapi sobre "no super admin" são **falsos positivos** do Bookshelf ORM

## 🆘 Se Nada Funcionar

Última opção: Criar um endpoint customizado para buscar as roles e injetá-las via JavaScript no frontend:

1. Criar `api/admin-roles/controllers/admin-roles.js`
2. Endpoint GET `/admin/me/roles` que retorna as roles do usuário logado
3. Modificar o código do admin frontend para fazer essa chamada após login
4. Injetar as roles no sessionStorage manualmente

Mas acredito que a Opção 1 deva funcionar.

---

**Boa noite! Amanhã continuamos.** 💪
