# Beever Entrega de Docker

**Nome do Projeto Integrador:** Beever

**Tecnologias:** Node.js 22 com ES Modules, Express 5, EJS renderizado no servidor, Tailwind CSS via CLI, MySQL 8 com o driver mysql2 e pool singleton (sem ORM), sessões em `express-session` com store no MySQL, bcrypt para senhas, helmet para cabeçalhos de segurança, pino para log estruturado e Docker multi-stage para empacotar. A arquitetura é em camadas no padrão MVC + Service + Repository, com fluxo estrito Controller -> Service -> Repository -> banco.

**Dependências:**

Produção: bcrypt, cors, dotenv, ejs, express, express-mysql-session, express-rate-limit, express-session, express-validator, helmet, mysql2, node-cron, pino, pino-http, uuid.

Desenvolvimento: @eslint/js, @tailwindcss/cli, eslint, globals, pino-pretty, supertest, tailwindcss.

**Instituição:** FATEC Lins

**Disciplina:** DevOps

**Curso e turma:** 5º AMS

**Integrantes:** Luan, Lucas Verdelli, Vinícius Duarte e Vinícius Santana

**Objetivo do sistema:** Plataforma com gamificação focada em educação financeira.

## Como funciona a imagem

O `Dockerfile` tem dois estágios. O primeiro instala todas as dependências e compila o CSS do Tailwind. A segunda parte de uma imagem limpa, instala só as dependências de produção, copia o código já com o CSS pronto e roda como o usuário `node`, nunca como root ou admin. A aplicação roda na porta 3000 dentro do contêiner.

## Build

```bash
docker build -t beever:devops .
```

## Rodar

A aplicação precisa de um MySQL 8 acessível e de um arquivo `.env`. Copie o modelo e ajuste os valores antes de subir:

```bash
cp .env.example .env
```

Subindo o contêiner com esse `.env` e publicando a porta 3000 na máquina:

```bash
docker run --rm --name beever-app --env-file .env -p 3000:3000 beever:devops
```

Se o MySQL estiver rodando na sua própria máquina e não em outro contêiner, o `DB_HOST` do `.env` precisa apontar para o host e não para `localhost`, porque dentro do contêiner `localhost` é o próprio contêiner. No Linux, a forma mais simples é subir com a rede do host:

```bash
docker run --rm --name beever-app --env-file .env --network host beever:devops
```

Com o contêiner no ar, abra `http://localhost:3000` no navegador.

## Preparar o banco na primeira vez

As migrations e as seeds rodam dentro do próprio contêiner:

```bash
docker run --rm --env-file .env --network host beever:devops npm run db:migrate
docker run --rm --env-file .env --network host beever:devops npm run db:seed
```

## Parar

```bash
docker stop beever-app
```

## Alternativa pra quem não tem MySQL e nem compose, PC só com Docker

Segunda opção pra o caso da máquina estar zerada, tipo um Pc novo sem nada instalado

A imagem self contained já traz o MySQL 8 e o app num contêiner só, então não precisa banco externo nem configurar variável

No primeiro boot ela inicializa o banco, roda as migrations e carrega os dados de exemplo sozinha

Depois fica tudo guardado no volume, então nos próximos boots ela sobe direto

### Build da imagem com o MySQL junto

```bash
docker build -f Dockerfile.selfcontained -t beever:selfcontained .
```

### Salvar em arquivo pra levar pra outra máquina

```bash
docker save -o beever_selfcontained.tar beever:selfcontained
```

### Na máquina nova com só o Docker

```bash
docker load -i beever_selfcontained.tar
docker run --rm --name beever -p 3000:3000 beever:selfcontained
```

É só abrir http://localhost:3000 que já tá no ar

Se quiser mexer no MySQL de fora, publique a porta com `-p 3306:3306` junto

As credenciais internas padrão são usuário `beever` / senha `beever` e `root` / `beever_root`

Dá pra trocar passando as variáveis `MYSQL_DATABASE`, `MYSQL_USER`, `MYSQL_PASSWORD` e `MYSQL_ROOT_PASSWORD` no `docker run`

Usuário de demonstração do sistema: `admin@beever.dev` / `admin1234`
