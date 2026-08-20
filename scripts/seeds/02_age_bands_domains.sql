
INSERT INTO age_bands (code, name, min_age, max_age, is_economy_enabled, is_upkeep_enabled) VALUES
  ('A', 'Faixa A — primeiros passos',  6,  8, 1, 0),
  ('B', 'Faixa B — explorando',        9, 11, 1, 1),
  ('C', 'Faixa C — planejando',       12, 15, 1, 1)
AS novo
ON DUPLICATE KEY UPDATE
  name = novo.name, min_age = novo.min_age, max_age = novo.max_age,
  is_economy_enabled = novo.is_economy_enabled, is_upkeep_enabled = novo.is_upkeep_enabled;

INSERT INTO avatars (slug, name, image_path) VALUES
  ('beenie-classico',   'Beenie',            '/img/beenie_howdy.png'),
  ('beenie-explorador', 'Beenie explorador', '/img/beenie_vem.png'),
  ('beenie-dourado',    'Beenie dourado',    '/img/beenie_1real.png'),
  ('babybee',           'Abelhinha',         '/img/babybee.png')
AS novo
ON DUPLICATE KEY UPDATE name = novo.name, image_path = novo.image_path;

INSERT INTO initial_goals (slug, label) VALUES
  ('comprar-algo',       'Quero comprar algo'),
  ('aprender-a-guardar', 'Quero aprender a guardar'),
  ('entender-juros',     'Quero entender juros')
AS novo
ON DUPLICATE KEY UPDATE label = novo.label;

INSERT INTO game_types (slug, name, description) VALUES
  ('quiz-do-favo',          'Quiz do Favo',           'Perguntas de múltipla escolha sobre o conteúdo da célula'),
  ('arraste-e-classifique', 'Arraste e Classifique',  'Separa itens em categorias, com alternativa por clique e teclado'),
  ('monte-o-orcamento',     'Monte o Orçamento',      'Distribui uma quantia entre necessidades e desejos'),
  ('cofre-do-tempo',        'Cofre do Tempo',         'Simula juros compostos ao longo de ciclos'),
  ('mercado-esperto',       'Mercado Esperto',        'Compara preços e decide a melhor compra'),
  ('ordene-a-prioridade',   'Ordene a Prioridade',    'Coloca gastos em ordem de importância')
AS novo
ON DUPLICATE KEY UPDATE name = novo.name, description = novo.description;

INSERT INTO game_session_statuses (slug, name) VALUES
  ('aberta',     'Aberta'),
  ('concluida',  'Concluída'),
  ('abandonada', 'Abandonada'),
  ('expirada',   'Expirada')
AS novo
ON DUPLICATE KEY UPDATE name = novo.name;

INSERT INTO reward_reasons (slug, name) VALUES
  ('conclusao-celula',      'Conclusão de célula'),
  ('conclusao-meta',        'Conclusão de meta'),
  ('conclusao-tarefa',      'Conclusão de tarefa'),
  ('marco-de-sequencia',    'Marco de sequência'),
  ('subida-de-nivel',       'Subida de nível'),
  ('renda-passiva',         'Renda passiva de item'),
  ('rendimento-cofre',      'Rendimento do cofre'),
  ('deposito-cofre',        'Depósito no cofre'),
  ('saque-cofre',           'Saque do cofre'),
  ('compra',                'Compra na loja'),
  ('custo-fixo',            'Custo fixo de item'),
  ('venda-item',            'Venda de item'),
  ('venda-por-inadimplencia', 'Venda forçada por inadimplência'),
  ('ajuste-administrativo', 'Ajuste administrativo')
AS novo
ON DUPLICATE KEY UPDATE name = novo.name;

INSERT INTO goal_types (slug, name, progress_source) VALUES
  ('acumular-mel',        'Acumular mel',            'coin_balance'),
  ('alcancar-patrimonio', 'Alcançar patrimônio',     'patrimony_total'),
  ('concluir-favo',       'Concluir um favo',        'hive_completed'),
  ('concluir-celulas',    'Concluir células',        'cell_completed'),
  ('manter-sequencia',    'Manter sequência',        'streak_days'),
  ('guardar-no-cofre',    'Guardar no cofre',        'vault_balance'),
  ('atingir-nivel',       'Atingir nível',           'user_level')
AS novo
ON DUPLICATE KEY UPDATE name = novo.name, progress_source = novo.progress_source;

INSERT INTO goal_statuses (slug, name) VALUES
  ('ativa',     'Ativa'),
  ('concluida', 'Concluída'),
  ('expirada',  'Expirada'),
  ('renovada',  'Renovada')
AS novo
ON DUPLICATE KEY UPDATE name = novo.name;

INSERT INTO goal_difficulties (slug, name, reward_multiplier, reward_coins, reward_points, default_days) VALUES
  ('alta',    'Alta',    2.000, 200, 120, 28),
  ('media',   'Média',   1.500, 150,  90, 14),
  ('simples', 'Simples', 1.000, 100,  60,  7)
AS novo
ON DUPLICATE KEY UPDATE
  name = novo.name, reward_multiplier = novo.reward_multiplier,
  reward_coins = novo.reward_coins, reward_points = novo.reward_points,
  default_days = novo.default_days;

INSERT INTO goal_plan_rules (min_weekdays, max_weekdays, active_goals, difficulty_id)
SELECT dados.minimo, dados.maximo, dados.metas, dificuldade.id
  FROM (
    SELECT 1 AS minimo, 2 AS maximo, 1 AS metas, 'alta'    AS dificuldade
    UNION ALL SELECT 3, 4, 2, 'media'
    UNION ALL SELECT 5, 7, 3, 'simples'
  ) AS dados
  JOIN goal_difficulties dificuldade ON dificuldade.slug = dados.dificuldade
ON DUPLICATE KEY UPDATE
  active_goals = dados.metas, difficulty_id = dificuldade.id;

INSERT INTO goal_target_rules (goal_type_id, base_per_session, min_increment, max_increment, rounding_step)
SELECT tipo.id, dados.base, dados.minimo, dados.maximo, dados.passo
  FROM (
    SELECT 'acumular-mel' AS tipo, 25.000 AS base,  50 AS minimo, 500 AS maximo, 25 AS passo
    UNION ALL SELECT 'atingir-nivel',      0.100,       1,          1,           1
  ) AS dados
  JOIN goal_types tipo ON tipo.slug = dados.tipo
ON DUPLICATE KEY UPDATE
  base_per_session = dados.base, min_increment = dados.minimo,
  max_increment = dados.maximo, rounding_step = dados.passo;

INSERT INTO task_scopes (slug, name) VALUES
  ('diaria',  'Diária'),
  ('semanal', 'Semanal')
AS novo
ON DUPLICATE KEY UPDATE name = novo.name;

INSERT INTO task_types (slug, name, scope_id, progress_source, default_target, reward_points, reward_coins, is_active)
SELECT dados.slug, dados.name, escopo.id, dados.progress_source, dados.alvo, dados.polen, dados.mel, dados.ativo
  FROM (
    SELECT 'concluir-3-celulas'  AS slug, 'Conclua 3 células hoje'        AS name, 'diaria'  AS escopo, 'cell_completed' AS progress_source, 3   AS alvo, 15 AS polen, 20 AS mel, 1 AS ativo
    UNION ALL SELECT 'depositar-no-cofre', 'Deposite 50 de mel no cofre',        'diaria',  'vault_deposit',   50,  10, 15, 0
    UNION ALL SELECT 'jogar-3-dias',       'Jogue em 3 dias diferentes',         'semanal', 'active_days',      3,  40, 60, 1
    UNION ALL SELECT 'concluir-favo-semana','Conclua um favo esta semana',       'semanal', 'hive_completed',   1,  50, 80, 1
  ) AS dados
  JOIN task_scopes escopo ON escopo.slug = dados.escopo
ON DUPLICATE KEY UPDATE
  name = dados.name, progress_source = dados.progress_source,
  default_target = dados.alvo, reward_points = dados.polen, reward_coins = dados.mel,
  is_active = dados.ativo;

INSERT INTO streak_event_types (slug, name) VALUES
  ('cumprido',  'Dia cumprido'),
  ('perdido',   'Dia perdido'),
  ('protegido', 'Protegido pelo escudo'),
  ('neutro',    'Dia neutro')
AS novo
ON DUPLICATE KEY UPDATE name = novo.name;

INSERT INTO item_categories (slug, name) VALUES
  ('moradia',     'Moradia'),
  ('transporte',  'Transporte'),
  ('tecnologia',  'Tecnologia'),
  ('negocios',    'Negócios'),
  ('cosmeticos',  'Cosméticos'),
  ('utilitarios', 'Utilitários')
AS novo
ON DUPLICATE KEY UPDATE name = novo.name;

INSERT INTO item_behaviors (slug, name, description) VALUES
  ('neutro',     'Neutro',        'Não muda de valor nem gera custo'),
  ('valoriza',   'Valoriza',      'Ganha valor a cada ciclo'),
  ('deprecia',   'Deprecia',      'Perde valor a cada ciclo, respeitando um piso'),
  ('custo_fixo', 'Custo fixo',    'Cobra mel do saldo a cada ciclo'),
  ('gera_renda', 'Gera renda',    'Credita mel no saldo a cada ciclo')
AS novo
ON DUPLICATE KEY UPDATE name = novo.name, description = novo.description;

INSERT INTO item_requirement_types (slug, name) VALUES
  ('nivel-minimo',      'Nível mínimo'),
  ('favo-concluido',    'Favo concluído'),
  ('item-prerequisito', 'Item pré-requisito'),
  ('patrimonio-minimo', 'Patrimônio mínimo')
AS novo
ON DUPLICATE KEY UPDATE name = novo.name;

INSERT INTO inventory_statuses (slug, name) VALUES
  ('ativo',        'Ativo'),
  ('inadimplente', 'Inadimplente'),
  ('vendido',      'Vendido'),
  ('consumido',    'Consumido')
AS novo
ON DUPLICATE KEY UPDATE name = novo.name;

INSERT INTO vault_transaction_types (slug, name) VALUES
  ('deposito',   'Depósito'),
  ('saque',      'Saque'),
  ('rendimento', 'Rendimento do ciclo'),
  ('bonus-meta', 'Bônus por bater a meta do cofre')
AS novo
ON DUPLICATE KEY UPDATE name = novo.name;

INSERT INTO audit_actor_types (slug, name) VALUES
  ('usuario', 'Usuário'),
  ('admin',   'Administrador'),
  ('sistema', 'Sistema')
AS novo
ON DUPLICATE KEY UPDATE name = novo.name;
