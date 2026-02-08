# 🚨 LEIA ISTO AMANHÃ

## Problema: Menu lateral do admin Strapi está vazio

**Status:** Roles não carregam no login (sessionStorage mostra `roles: []`)

## ✅ SOLUÇÃO PRONTA

Execute este comando no PowerShell:

```powershell
cd D:\CoraApp\caminho-de-cora-backend
.\CORRIGIR-ROLES-ADMIN.ps1
```

O script vai:
1. ✅ Fazer backup do arquivo original
2. ✅ Modificar `strapi-admin/services/auth.js` para popular roles
3. ✅ Mostrar instruções do que fazer depois

## 📄 Documentação Completa

Veja todos os detalhes em:
- `app/SOLUCAO-ROLES-ADMIN.md`

## 🎯 O que esperar

Após executar o script e reiniciar o servidor:
- ✅ Login vai funcionar
- ✅ Session Storage vai mostrar `roles: [{...}]` preenchido
- ✅ Menu lateral vai aparecer com todas as opções
- ✅ Você vai ter acesso completo ao admin panel

## 📊 Dados do Banco

**Tudo certo!** ✅
- Admin: natasha.sophie@gmail.com
- Role: Super Admin (80 permissões)
- Backup: `database/backups/postgres-backup-2026-02-07.sql`

---

**Boa sorte amanhã!** 💪 O problema está identificado e a solução está pronta.
