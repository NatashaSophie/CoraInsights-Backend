
## API - Caminho de Cora

API da aplicação Caminho de Cora desenvolvido com Strapi V3.

### Requisitos

| Tecnologia   | Versão       | 
| :---------- | :--------- | 
| Strapi | 3 | 
| Node | 18.20.4 | 
| Docker | 26.1.4 | 
| Docker Compose | 2.28.1 | 
| PostgreSQL | 16.3 | 

### Instalação

#### Local
```
npm install
npm run develop
```

#### Docker
Antes de criar os containers, limpar as seguintes pastas para evitar conflitos:
```
rm -rf app/node_modules/ data/ app/build/ app/exports/ app/.cache/
```

Docker-compose:
```
docker-compose build --no-cache && docker-compose up -d
```

- **Obs:** Após concluído, acessar a ADMIN_URL e definir o usuário Administrador e configurar o sistema.

### Documentação

- [Strapi V3](https://docs-v3.strapi.io/developer-docs/latest/getting-started/introduction.html)
- [Docker](https://docs.docker.com/)
- [Docker compose](https://docs.docker.com/compose/)
- [PostgreSQL](https://www.postgresql.org/docs/)
