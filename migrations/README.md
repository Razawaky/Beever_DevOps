# Migrations

Schema definitivo do Beever, derivado na etapa E01. A auditoria que justifica
cada decisão está em [`../docs/01-AUDITORIA-DO-SCHEMA.md`](../docs/01-AUDITORIA-DO-SCHEMA.md);
o mapa de nomes vindos do banco antigo está em
[`../docs/00-MAPA-DE-NOMES-LEGADO.md`](../docs/00-MAPA-DE-NOMES-LEGADO.md).

## Ordem

O runner (`scripts/migrate.js`) lê os arquivos em ordem lexical e registra o que
já aplicou em `schema_migrations`. Nunca renumere um arquivo já aplicado.

| Arquivo | Conteúdo |
|---|---|
| `001_core_users.sql` | Faixas de idade, avatares, objetivos iniciais, contas, perfis, administradores, disponibilidade semanal, consentimento do responsável, store de sessão |
| `002_content_hives_cells.sql` | Tipos de jogo, favos, células, conteúdo e progresso da trilha |
| `003_rewards_ledgers.sql` | Curva de níveis, carteira, livros de XP/pólen/mel, configuração de recompensa, sessões de jogo, idempotência |
| `004_goals_tasks_streaks.sql` | Metas, tarefas e sequência |
| `005_economy_items_inventory.sql` | Itens, comportamento econômico, requisitos, compras, inventário, cofre, ciclos econômicos, patrimônio |
| `006_audit_operational.sql` | Auditoria append-only |
| `007_gamification.sql` | Conquistas e liga (P1, aplicável depois sem tocar no resto) |

## Convenções

Definidas em `docs/03-BANCO-DE-DADOS-DBA.md`, seção 3, e valendo para todos os
arquivos acima:

- InnoDB, `utf8mb4`, collation `utf8mb4_0900_ai_ci` declarada explicitamente.
- Tabela em `snake_case` **plural**; chave primária `id BIGINT UNSIGNED`; chave
  estrangeira `<entidade_singular>_id`.
- Booleano é `TINYINT(1) NOT NULL DEFAULT 0` com prefixo `is_` ou `has_`.
- Datas em `DATETIME` **UTC**. O fuso do usuário fica em `profiles.timezone` —
  a virada do dia da sequência (RN-024) usa esse fuso, nunca o do servidor.
- `created_at` e `updated_at` em toda tabela de negócio.
- Enum é **tabela de domínio**, nunca `ENUM` de coluna: acrescentar um estado
  novo não pode exigir migration destrutiva.
- Dinheiro (mel, preço, patrimônio, cofre) é `BIGINT` em unidades inteiras.
  XP e pólen são `INT UNSIGNED`. Taxas são `DECIMAL(6,3)`. Nunca `FLOAT`.
- Toda FK tem `ON DELETE` explícito: catálogo `RESTRICT`, dado de progresso do
  usuário `CASCADE`, ledger e auditoria `RESTRICT`.
- Cada arquivo traz a instrução de reversão em comentário no topo.

## `_legacy/`

`_legacy/001_schema_inicial.sql` e `_legacy/002_perfil_onboarding_concluido.sql`
são o schema anterior, **arquivado e não aplicado**. O runner ignora
subdiretórios. Não apague: é a referência das decisões de integridade que foram
aproveitadas e o histórico de como o banco chegou até aqui.

O dump do banco original está em `../beever.sql` (só estrutura) e
`../docs/legacy/beever.sql` (estrutura e dados).

## Aplicar

```
docker compose up -d mysql
npm run db:migrate
npm run db:seed
```

Se o banco já tiver as migrations antigas registradas em `schema_migrations`, é
preciso recriá-lo do zero — a numeração recomeça em `001` e o runner não sabe
que os nomes antigos foram arquivados.
