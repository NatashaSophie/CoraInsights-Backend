# Database - Backups e Exportações

Esta pasta contém backups e exportações do banco de dados PostgreSQL do Strapi.

## 📁 Estrutura

```
database/
├── backups/          # Backups SQL completos do banco de dados
├── csv-exports/      # Exportações de todas as tabelas em formato CSV
└── exports/          # Outras exportações
```

## 📦 Backups

### Backup SQL (backups/)
- **Arquivo**: `postgres-backup-YYYY-MM-DD.sql`
- **Conteúdo**: Backup completo de todas as tabelas com dados
- **Formato**: SQL executável (INSERT statements)
- **Uso**: Pode ser restaurado diretamente no PostgreSQL

### Resumo do Backup
- **Arquivo**: `backup-summary-YYYY-MM-DD.txt`
- **Conteúdo**: Resumo com contagem de linhas de cada tabela
- **Formato**: Texto simples

### Gerar Backup e CSVs via Script
Para gerar um backup SQL (data-only) e exportar todas as tabelas em CSV:

```bash
node scripts/maintenance/backup-and-export.js
```

O script cria:
- `database/backups/postgres-backup-YYYY-MM-DD.sql`
- `database/backups/backup-summary-YYYY-MM-DD.txt`
- `database/exports/YYYY-MM-DD_HH-MM-SS/` (CSVs + _RESUMO)

## 📊 Exportações CSV (csv-exports/)

Cada arquivo CSV contém os dados de uma tabela:

**Tabelas de Configuração:**
- `core_store.csv` - 45 linhas - Configurações do Strapi
- `i18n_locales.csv` - 1 linha - Locales configurados
- `strapi_permission.csv` - 143 linhas - Permissões do admin
- `strapi_role.csv` - 3 linhas - Roles do admin (Super Admin, Editor, Author)
- `users-permissions_permission.csv` - 282 linhas - Permissões de usuários
- `users-permissions_role.csv` - 2 linhas - Roles de usuários (Authenticated, Public)

**Tabelas de Dados (vazias no momento):**
- `auth.csv` - Autenticações customizadas
- `certificates.csv` - Certificados de peregrinos
- `checkpoints.csv` - Pontos de controle das trilhas
- `establishments.csv` - Estabelecimentos comerciais
- `trails.csv` - Trilhas do Caminho de Cora
- `trail_parts.csv` - Partes/etapas das trilhas
- `trail_routes.csv` - Rotas completas
- `strapi_administrator.csv` - Usuários admin do Strapi
- `users-permissions_user.csv` - Usuários do app (peregrinos, gestores, comerciantes)
- `upload_file.csv` - Arquivos de mídia

## 🔄 Como Restaurar o Backup

### Restaurar Backup SQL Completo:
```bash
psql -h localhost -p 5432 -U postgres -d postgres < backups/postgres-backup-2026-02-07.sql
```

### Importar CSV Individual:
```bash
psql -h localhost -p 5432 -U postgres -d postgres -c "\COPY nome_tabela FROM 'csv-exports/nome_tabela.csv' WITH CSV HEADER"
```

### Importar CSV Individual (UTF-8 recomendado):
```bash
PGCLIENTENCODING=UTF8 psql -h localhost -p 5432 -U postgres -d postgres -c "\COPY nome_tabela FROM 'csv-exports/nome_tabela.csv' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8')"
```

## 📝 Notas

- **Data do último backup**: 07/02/2026 21:25
- **Total de tabelas**: 26
- **Total de registros**: 1.366 linhas
- **Tamanho do backup SQL**: ~530 KB
- **Database**: postgres
- **Host**: localhost:5432
- **User**: postgres

### 📦 Backups Disponíveis

#### Backup Atual (Após Restauração)
- **Timestamp**: 2026-02-07_21-25-40
- **SQL**: backups/postgres-backup-2026-02-07.sql (530 KB)
- **CSVs**: exports/2026-02-07_21-25-40/
- **Registros**: 1.366 linhas
- **Status**: ✅ Completo com todos os dados restaurados

#### Backup Original (Antes da Restauração)
- **Data**: 07/02/2026 17:41
- **SQL**: backups/postgres-backup-2026-02-07.sql (171 KB - SOBREPOSTO)
- **Registros**: 476 linhas (apenas configurações)

### 🔄 Última Restauração

- **Data**: 07/02/2026 ~21:00
- **Origem**: exports/2026-02-01_560524/
- **Registros restaurados**: 1.366 linhas
- **Status**: ✅ Completo e operacional
- **Detalhes**: Ver [RESTAURACAO-2026-02-07.md](RESTAURACAO-2026-02-07.md)

## ⚠️ Importante

- Os backups são criados automaticamente com a data no nome do arquivo
- Mantenha backups regulares antes de modificações importantes
- Garanta que os CSVs estejam salvos em UTF-8 para evitar problemas de acentuacao
- Os CSVs podem ser abertos em Excel/LibreOffice para análise
- Sempre teste restaurações em um ambiente de teste primeiro
