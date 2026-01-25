# 🔓 Como Habilitar Acesso Público às Trail-Routes

## Passo a Passo:

### 1. Acesse o Admin Panel
Abra: `http://localhost:1337/admin`

### 2. Navegue até Configurações
- No menu lateral esquerdo, clique em **"Settings"** (⚙️ Configurações)
- Ou vá direto: `http://localhost:1337/admin/settings/users-permissions/roles`

### 3. Edite a Role "Public"
- Clique em **"Users & Permissions Plugin"**
- Clique em **"Roles"**
- Clique na role **"Public"**

### 4. Habilite as Permissões
- Encontre a seção **"Trail-Route"** na lista de permissões
- Marque as caixas:
  - ✅ **find** (listar todas as trail-routes)
  - ✅ **findOne** (buscar uma trail-route específica)

### 5. Salve
- Role a página até o final
- Clique no botão **"Save"** (azul, no canto superior direito)

### 6. Teste
- Acesse: `http://localhost:1337/trail-routes/1`
- Deve retornar JSON com os dados da trail-route

### 7. Use o Visualizador
- Acesse: `http://localhost:1337/trail-route-map.html`
- Digite o ID (ex: 1) e clique em "Carregar Mapa"

---

## ⚠️ Se não funcionar:

1. **Limpe o cache** do navegador (Ctrl + Shift + Del)
2. **Reinicie o Strapi**:
   ```powershell
   # Parar
   Get-Process -Name node | Stop-Process -Force
   
   # Iniciar
   cd d:\CoraApp\caminho-de-cora-backend\app
   npm run develop
   ```
3. Verifique novamente as permissões no admin

---

## 📸 Referência Visual:

```
Settings > Users & Permissions Plugin > Roles > Public

Trail-Route
├── [✅] count
├── [✅] create
├── [✅] delete
├── [✅] find         ← HABILITE ESTA
├── [✅] findOne      ← HABILITE ESTA
└── [✅] update
```
