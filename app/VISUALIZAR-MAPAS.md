# 🗺️ Como Visualizar o Mapa GPS no Admin do Strapi

## Opção 1: Link Direto (Mais Fácil)

Quando estiver visualizando uma Trail-Route no admin, modifique a URL:

**De:**
```
http://localhost:1337/admin/plugins/content-manager/collectionType/application::trail-route.trail-route/506
```

**Para:**
```
http://localhost:1337/trail-route-map.html?id=506
```

Simplesmente troque tudo depois do domínio por `/trail-route-map.html?id=` + o ID da rota.

---

## Opção 2: Bookmarklet (Atalho no Navegador)

### Passo 1: Criar o Bookmark
1. Pressione **Ctrl + Shift + O** (Chrome/Edge) ou **Ctrl + B** (Firefox) para abrir Favoritos
2. Clique com botão direito → **Adicionar nova página/favorito**
3. Nome: **🗺️ Ver Mapa GPS**
4. URL: Cole isso:
```javascript
javascript:(function(){var id=window.location.pathname.split('/').pop();if(id&&!isNaN(id)){window.open('/trail-route-map.html?id='+id,'_blank')}else{alert('Abra esta página em uma Trail-Route para usar!')}})();
```

### Passo 2: Usar
1. Abra qualquer Trail-Route no admin
2. Clique no favorito **🗺️ Ver Mapa GPS**
3. O mapa abrirá em nova aba!

---

## Opção 3: Console do Navegador

1. Abra uma Trail-Route no admin
2. Pressione **F12** para abrir DevTools
3. Vá na aba **Console**
4. Cole e execute:
```javascript
window.open('/trail-route-map.html?id=' + window.location.pathname.split('/').pop(), '_blank')
```

---

## Visualizador de Mapas

Acesse diretamente: **http://localhost:1337/trail-route-map.html**

Digite qualquer ID de trail-route (506 a 758) e clique em "Carregar Mapa"

---

## 📌 IDs Disponíveis

Para ver todos os IDs disponíveis, execute no terminal:

```bash
cd d:\CoraApp\caminho-de-cora-backend\app
node -e "const {Client}=require('pg');const c=new Client({host:'localhost',port:5432,user:'postgres',password:'postgres',database:'strapi'});c.connect().then(()=>c.query('SELECT id FROM trail_routes ORDER BY id')).then(r=>{console.log('IDs:',r.rows.map(x=>x.id).join(', '));c.end()});"
```
