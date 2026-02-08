# Estrutura do Projeto - Limpeza Realizada

## ✅ Mudanças Realizadas (07/02/2026)

### Problema Identificado
Havia pastas e arquivos duplicados entre a raiz (`d:\CoraApp\caminho-de-cora-backend\`) e a subpasta `app\`, causando confusão sobre qual era a estrutura correta do projeto Strapi.

### Análise
- **Docker**: Aponta para `./app` como contexto de build
- **Scripts de diagnóstico**: Todos criados em `app/`
- **Package.json correto**: Em `app/` (contém `bcryptjs` e outras dependências atualizadas)
- **Dockerfile**: Localizado em `app/`

### Conclusão
A estrutura correta do Strapi está em **`app/`**. Tudo na raiz eram arquivos/pastas obsoletos duplicados.

### Pastas Removidas da Raiz
✅ `admin/` (duplicado)
✅ `api/` (duplicado)
✅ `build/` (duplicado)
✅ `components/` (duplicado)
✅ `config/` (duplicado)
✅ `exports/` (duplicado)
✅ `extensions/` (duplicado)
✅ `public/` (duplicado)

### Arquivos Removidos da Raiz
✅ `package.json` (duplicado)
✅ `package-lock.json` (duplicado)
✅ `node_modules/` (duplicado)

### Arquivo Corrigido
✅ `iniciar-backend.bat` - Agora executa de dentro de `app/`

## 📁 Estrutura Final

```
caminho-de-cora-backend/
├── .cache/                    # Cache do Strapi
├── .tmp/                      # Arquivos temporários
├── .env                       # Variáveis de ambiente
├── .env.development.local     # Env local
├── .env.example               # Template de env
├── .dockerignore
├── .gitignore
├── .strapi-updater.json
├── docker-compose.yaml        # Configuração Docker
├── docker-compose.prod.yaml   # Configuração Docker produção
├── iniciar-backend.bat        # Script de inicialização (CORRIGIDO: agora roda em app/)
├── strapi.config.js           # Configuração Strapi
├── server.log                 # Logs do servidor
├── server-latest.log
├── server-final.log
└── app/                       # ⭐ PROJETO STRAPI (ESTRUTURA CORRETA)
    ├── admin/                 # Painel admin do Strapi
    ├── api/                   # APIs e controllers
    ├── components/            # Componentes reutilizáveis
    ├── config/                # Configurações
    │   └── functions/
    │       └── bootstrap.js   # Bootstrap customizado
    ├── extensions/            # Extensões customizadas
    │   └── auth/
    │       └── index.js.disabled
    ├── hooks/                 # Hooks customizados
    │   └── custom-auth.js.disabled
    ├── middlewares/           # Middlewares
    ├── public/                # Arquivos públicos
    ├── scripts/               # Scripts auxiliares
    ├── data/                  # Dados
    ├── database/              # Database exports
    ├── exports/               # Exports
    ├── lib/                   # Bibliotecas
    ├── node_modules/          # Dependências (ÚNICA CÓPIA)
    ├── package.json           # Dependências do projeto (ÚNICO)
    ├── package-lock.json      # Lock file (ÚNICO)
    ├── Dockerfile             # Docker para o container
    ├── Dockerfile.prod        # Docker para produção
    ├── docker-entrypoint.sh   # Script de entrada Docker
    ├── README.md              # Documentação
    └── [scripts de diagnóstico].js
```

## 🎯 Benefícios da Limpeza

1. ✅ **Sem confusão**: Agora há apenas UMA estrutura de projeto
2. ✅ **Caminho correto**: `iniciar-backend.bat` executa de `app/`
3. ✅ **Economia de espaço**: Removidas cópias duplicadas de node_modules (~150MB+)
4. ✅ **Manutenção simplificada**: Apenas um package.json para gerenciar
5. ✅ **Consistência com Docker**: Estrutura alinhada com docker-compose

## ⚙️ Comandos para Iniciar

### Desenvolvimento Local
```bash
# Opção 1: Usar o script
cd D:\CoraApp\caminho-de-cora-backend
iniciar-backend.bat

# Opção 2: Direto
cd D:\CoraApp\caminho-de-cora-backend\app
npm run develop
```

### Docker
```bash
cd D:\CoraApp\caminho-de-cora-backend
docker-compose up
```

## 📝 Notas Importantes

### Rotas Customizadas de Auth
As rotas customizadas de autenticação (`/api/auth/login`, `/api/auth/validate`) estão **DESABILITADAS** no momento para não interferir com o admin do Strapi:

- `app/hooks/custom-auth.js` → `custom-auth.js.disabled`
- `app/extensions/auth/index.js` → `index.js.disabled`
- `app/config/functions/bootstrap.js` → Rotas comentadas

**Para reabilitar após criar o primeiro admin:**
1. Renomeie os arquivos `.disabled` de volta para `.js`
2. Descomente o bloco de rotas no `bootstrap.js`

### Primeira Execução do Admin
1. Pare o servidor Strapi
2. Limpe cookies do navegador ou use modo anônimo
3. Inicie o servidor: `npm run develop` (de dentro de `app/`)
4. Acesse: `http://localhost:1337/admin`
5. Registre o primeiro admin com: `natasha.sophie@gmail.com`

---

**Data da limpeza**: 07/02/2026  
**Pastas removidas**: 8 pastas + 3 arquivos importantes  
**Espaço economizado**: ~150MB+ (node_modules duplicado)
