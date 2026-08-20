
DELETE FROM users WHERE email IN ('admin@beever.dev', 'ana@beever.dev');


INSERT INTO users (email, nickname, password_hash, birth_date, onboarding_completed_at, last_login_at)
VALUES ('admin@beever.dev', 'Prof', @admin_hash, '1988-07-02', UTC_TIMESTAMP(), UTC_TIMESTAMP());

SET @admin_user_id = LAST_INSERT_ID();

INSERT INTO admins (user_id) VALUES (@admin_user_id);

INSERT INTO profiles (user_id, age_band_id, avatar_id, initial_goal_id, session_minutes)
SELECT @admin_user_id, faixa.id, avatar.id, objetivo.id, 20
  FROM age_bands faixa
  JOIN avatars avatar ON avatar.slug = 'beenie-classico'
  JOIN initial_goals objetivo ON objetivo.slug = 'entender-juros'
 WHERE faixa.code = 'C';

INSERT INTO wallets (user_id, coins, points_total) VALUES (@admin_user_id, 0, 0);
INSERT INTO user_levels (user_id, level, xp_total, xp_next_level) VALUES (@admin_user_id, 1, 0, 280);

INSERT INTO users (email, nickname, password_hash, birth_date, onboarding_completed_at, last_login_at)
VALUES ('ana@beever.dev', 'Aninha', @demo_hash, '2018-03-12', UTC_TIMESTAMP(), UTC_TIMESTAMP());

SET @demo_user_id = LAST_INSERT_ID();

INSERT INTO profiles (user_id, age_band_id, avatar_id, initial_goal_id, session_minutes)
SELECT @demo_user_id, faixa.id, avatar.id, objetivo.id, 10
  FROM age_bands faixa
  JOIN avatars avatar ON avatar.slug = 'babybee'
  JOIN initial_goals objetivo ON objetivo.slug = 'comprar-algo'
 WHERE faixa.code = 'A';

INSERT INTO schedules (user_id, weekday, is_available) VALUES
  (@demo_user_id, 0, 0),
  (@demo_user_id, 1, 1),
  (@demo_user_id, 2, 0),
  (@demo_user_id, 3, 1),
  (@demo_user_id, 4, 0),
  (@demo_user_id, 5, 1),
  (@demo_user_id, 6, 0);

INSERT INTO guardian_consents (user_id, guardian_email) VALUES (@demo_user_id, 'responsavel@beever.dev');


INSERT INTO cell_progress (user_id, cell_id, stars, attempts, errors, best_score, first_completed_at, last_completed_at)
SELECT @demo_user_id, celula.id, dados.estrelas, 1, dados.erros, dados.pontuacao,
       UTC_TIMESTAMP() - INTERVAL dados.dias_atras DAY,
       UTC_TIMESTAMP() - INTERVAL dados.dias_atras DAY
  FROM (
    SELECT 'primeiros-passos' AS favo, 1 AS ordem, 3 AS estrelas, 0 AS erros, 100 AS pontuacao, 6 AS dias_atras
    UNION ALL SELECT 'primeiros-passos', 2, 3, 1, 90, 5
    UNION ALL SELECT 'primeiros-passos', 3, 3, 0, 100, 3
    UNION ALL SELECT 'primeiros-passos', 4, 2, 2, 75, 1
    UNION ALL SELECT 'guardar-e-gastar', 1, 2, 3, 70, 0
  ) AS dados
  JOIN hives favo ON favo.slug = dados.favo
  JOIN cells celula ON celula.hive_id = favo.id AND celula.order_index = dados.ordem;

INSERT INTO hive_progress (user_id, hive_id, completed_cells, total_cells, percent, completed_at)
SELECT @demo_user_id, favo.id,
       COUNT(progresso.id),
       COUNT(celula.id),
       ROUND(COUNT(progresso.id) * 100 / COUNT(celula.id)),
       IF(COUNT(progresso.id) = COUNT(celula.id), UTC_TIMESTAMP(), NULL)
  FROM hives favo
  JOIN cells celula ON celula.hive_id = favo.id
  LEFT JOIN cell_progress progresso
         ON progresso.cell_id = celula.id AND progresso.user_id = @demo_user_id
 GROUP BY favo.id;

INSERT INTO game_sessions (
  user_id, cell_id, status_id, token, started_at, finished_at,
  duration_seconds, errors, stars, xp_awarded, points_awarded, coins_awarded
)
SELECT @demo_user_id, progresso.cell_id, estado.id,
       UUID(),
       progresso.last_completed_at - INTERVAL 4 MINUTE,
       progresso.last_completed_at,
       240, progresso.errors, progresso.stars,
       config.xp_amount, config.points_amount, config.coins_amount
  FROM cell_progress progresso
  JOIN cells celula ON celula.id = progresso.cell_id
  JOIN reward_configs config
    ON config.game_type_id = celula.game_type_id
   AND config.age_band_id = celula.age_band_id
   AND config.stars = progresso.stars
  JOIN game_session_statuses estado ON estado.slug = 'concluida'
 WHERE progresso.user_id = @demo_user_id;


INSERT INTO coin_ledger (user_id, amount, reason_id, reference_type, balance_after, created_at)
SELECT @demo_user_id, dados.valor, motivo.id, dados.referencia, dados.saldo,
       UTC_TIMESTAMP() - INTERVAL dados.dias_atras DAY
  FROM (
    SELECT   25 AS valor, 'conclusao-celula' AS motivo, 'cell'  AS referencia,  25 AS saldo, 6 AS dias_atras
    UNION ALL SELECT  25, 'conclusao-celula', 'cell',   50, 5
    UNION ALL SELECT  25, 'conclusao-celula', 'cell',   75, 3
    UNION ALL SELECT  12, 'conclusao-celula', 'cell',   87, 1
    UNION ALL SELECT  12, 'conclusao-celula', 'cell',   99, 0
    UNION ALL SELECT 150, 'conclusao-meta',   'goal',  249, 0
    UNION ALL SELECT  20, 'conclusao-tarefa', 'task',  269, 0
    UNION ALL SELECT -200, 'compra',          'purchase', 69, 0
    UNION ALL SELECT  -50, 'deposito-cofre',  'vault',  19, 0
  ) AS dados
  JOIN reward_reasons motivo ON motivo.slug = dados.motivo;

INSERT INTO point_ledger (user_id, amount, reason_id, reference_type, balance_after, created_at)
SELECT @demo_user_id, dados.valor, motivo.id, dados.referencia, dados.saldo,
       UTC_TIMESTAMP() - INTERVAL dados.dias_atras DAY
  FROM (
    SELECT   20 AS valor, 'conclusao-celula' AS motivo, 'cell' AS referencia, 20 AS saldo, 6 AS dias_atras
    UNION ALL SELECT 20, 'conclusao-celula', 'cell', 40, 5
    UNION ALL SELECT 20, 'conclusao-celula', 'cell', 60, 3
    UNION ALL SELECT 10, 'conclusao-celula', 'cell', 70, 1
    UNION ALL SELECT 10, 'conclusao-celula', 'cell', 80, 0
    UNION ALL SELECT 15, 'conclusao-tarefa', 'task', 95, 0
  ) AS dados
  JOIN reward_reasons motivo ON motivo.slug = dados.motivo;

INSERT INTO xp_ledger (user_id, amount, reason_id, reference_type, balance_after, created_at)
SELECT @demo_user_id, dados.valor, motivo.id, dados.referencia, dados.saldo,
       UTC_TIMESTAMP() - INTERVAL dados.dias_atras DAY
  FROM (
    SELECT   35 AS valor, 'conclusao-celula' AS motivo, 'cell' AS referencia,  35 AS saldo, 6 AS dias_atras
    UNION ALL SELECT 35, 'conclusao-celula', 'cell',  70, 5
    UNION ALL SELECT 35, 'conclusao-celula', 'cell', 105, 3
    UNION ALL SELECT 20, 'conclusao-celula', 'cell', 125, 1
    UNION ALL SELECT 20, 'conclusao-celula', 'cell', 145, 0
    UNION ALL SELECT 50, 'conclusao-meta',   'goal', 195, 0
  ) AS dados
  JOIN reward_reasons motivo ON motivo.slug = dados.motivo;

INSERT INTO wallets (user_id, coins, points_total) VALUES (@demo_user_id, 19, 95);
INSERT INTO user_levels (user_id, level, xp_total, xp_next_level) VALUES (@demo_user_id, 1, 195, 280);


INSERT INTO purchases (user_id, item_id, quantity, price_at_purchase, total_price, purchased_at)
SELECT @demo_user_id, item.id, 1, item.price, item.price, UTC_TIMESTAMP() - INTERVAL 7 DAY
  FROM items item WHERE item.slug = 'patinete';

SET @demo_purchase_id = LAST_INSERT_ID();

INSERT INTO inventory (user_id, item_id, purchase_id, status_id, current_value, acquired_at)
SELECT @demo_user_id, item.id, @demo_purchase_id, estado.id, 198, UTC_TIMESTAMP() - INTERVAL 7 DAY
  FROM items item
  JOIN inventory_statuses estado ON estado.slug = 'ativo'
 WHERE item.slug = 'patinete';

INSERT INTO economic_cycles (user_id, cycle_number, processed_at, summary)
VALUES (
  @demo_user_id, 1, UTC_TIMESTAMP() - INTERVAL 1 DAY,
  JSON_OBJECT(
    'depreciacao', JSON_ARRAY(JSON_OBJECT('item', 'patinete', 'de', 200, 'para', 198)),
    'valorizacao', JSON_ARRAY(),
    'custos', 0,
    'renda', 0,
    'vendas_forcadas', JSON_ARRAY()
  )
);

INSERT INTO vaults (user_id, balance, interest_rate, goal_amount, goal_due_at)
VALUES (@demo_user_id, 51, 2.000, 300, UTC_TIMESTAMP() + INTERVAL 21 DAY);

INSERT INTO vault_transactions (user_id, transaction_type_id, amount, balance_after, created_at)
SELECT @demo_user_id, tipo.id, dados.valor, dados.saldo, UTC_TIMESTAMP() - INTERVAL dados.dias_atras DAY
  FROM (
    SELECT 50 AS valor, 'deposito' AS tipo, 50 AS saldo, 2 AS dias_atras
    UNION ALL SELECT 1, 'rendimento', 51, 1
  ) AS dados
  JOIN vault_transaction_types tipo ON tipo.slug = dados.tipo;


INSERT INTO goals (
  user_id, goal_type_id, status_id, difficulty_id, title,
  target_value, current_value, reward_coins, reward_points, starts_at, due_at, completed_at
)
SELECT @demo_user_id, tipo.id, estado.id, dificuldade.id, dados.titulo,
       dados.alvo, dados.atual, dados.mel, dados.polen,
       UTC_TIMESTAMP() - INTERVAL dados.dias_atras DAY,
       UTC_TIMESTAMP() - INTERVAL dados.dias_atras DAY + INTERVAL 14 DAY,
       IF(dados.estado = 'concluida', UTC_TIMESTAMP(), NULL)
  FROM (
    SELECT 'Conclua 3 células'         AS titulo, 'concluir-celulas' AS tipo, 'concluida' AS estado, 'media' AS dificuldade, 3   AS alvo, 3  AS atual, 150 AS mel, 0 AS polen, 10 AS dias_atras
    UNION ALL SELECT 'Junte 300 de mel',        'acumular-mel',     'ativa',     'media',              300,     19,     200,      0,     2
  ) AS dados
  JOIN goal_types tipo ON tipo.slug = dados.tipo
  JOIN goal_statuses estado ON estado.slug = dados.estado
  JOIN goal_difficulties dificuldade ON dificuldade.slug = dados.dificuldade;

INSERT INTO tasks (
  user_id, task_type_id, status_id, target_value, current_value,
  reward_points, reward_coins, due_at, completed_at
)
SELECT @demo_user_id, tipo.id, estado.id, tipo.default_target, dados.atual,
       tipo.reward_points, tipo.reward_coins,
       UTC_TIMESTAMP() + INTERVAL dados.dias_para_vencer DAY,
       IF(dados.estado = 'concluida', UTC_TIMESTAMP(), NULL)
  FROM (
    SELECT 'concluir-3-celulas' AS tipo, 'concluida' AS estado, 3 AS atual, 1 AS dias_para_vencer
    UNION ALL SELECT 'jogar-3-dias', 'ativa', 2, 4
  ) AS dados
  JOIN task_types tipo ON tipo.slug = dados.tipo
  JOIN goal_statuses estado ON estado.slug = dados.estado;

INSERT INTO streak_events (user_id, event_date, event_type_id)
SELECT @demo_user_id, CURDATE() - INTERVAL dados.dias_atras DAY, tipo.id
  FROM (
    SELECT 4 AS dias_atras, 'cumprido' AS tipo
    UNION ALL SELECT 3, 'neutro'
    UNION ALL SELECT 2, 'cumprido'
    UNION ALL SELECT 1, 'neutro'
    UNION ALL SELECT 0, 'cumprido'
  ) AS dados
  JOIN streak_event_types tipo ON tipo.slug = dados.tipo;

INSERT INTO streaks (user_id, current_days, best_days, shields_available, last_counted_date, last_evaluated_at)
VALUES (@demo_user_id, 3, 3, 0, CURDATE(), UTC_TIMESTAMP());
