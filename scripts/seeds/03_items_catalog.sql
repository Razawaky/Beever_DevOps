
INSERT INTO items (
  slug, name, description_kid, category_id, price, counts_in_patrimony,
  valuation_rate, valuation_floor_pct, valuation_cap_pct, upkeep_cost,
  income_per_cycle, is_consumable
)
SELECT dados.slug, dados.nome, dados.descricao, categoria.id, dados.preco, dados.patrimonio,
       dados.taxa, dados.piso, dados.teto, dados.custo, dados.renda, dados.consumivel
  FROM (
    SELECT 'cantinho-na-colmeia' AS slug, 'Cantinho na colmeia' AS nome, 'Seu primeiro espaço só seu. Ganha um pouquinho de valor toda semana.' AS descricao, 'moradia' AS categoria, 300 AS preco, 1 AS patrimonio, 0.500 AS taxa, 100 AS piso, 200 AS teto, 0 AS custo, 0 AS renda, 0 AS consumivel
    UNION ALL SELECT 'quarto-proprio', 'Quarto próprio', 'Mais espaço para você. Vale mais com o tempo, mas tem contas para pagar.', 'moradia', 900, 1, 0.700, 100, 200, 10, 0, 0
    UNION ALL SELECT 'casa-pequena', 'Casa pequena', 'Uma casa de verdade. Valoriza sempre, e custa para manter.', 'moradia', 2500, 1, 1.000, 100, 200, 30, 0, 0
    UNION ALL SELECT 'casa-media', 'Casa média', 'Maior que a pequena, com contas maiores também.', 'moradia', 6000, 1, 1.000, 100, 200, 60, 0, 0
    UNION ALL SELECT 'casa-grande', 'Casa grande', 'A maior da colmeia. Valoriza rápido, mas as contas pesam.', 'moradia', 15000, 1, 1.200, 100, 200, 120, 0, 0
    UNION ALL SELECT 'terreno', 'Terreno', 'Um pedaço de terra. Não tem conta para pagar e valoriza bem.', 'moradia', 4000, 1, 1.500, 100, 200, 0, 0, 0

    UNION ALL SELECT 'patinete', 'Patinete', 'Rápido e barato. Perde um pouco de valor toda semana.', 'transporte', 200, 1, -1.000, 50, 100, 0, 0, 0
    UNION ALL SELECT 'bicicleta', 'Bicicleta', 'Boa para todo dia. Perde valor e pede manutenção.', 'transporte', 500, 1, -1.000, 30, 100, 5, 0, 0
    UNION ALL SELECT 'skate-eletrico', 'Skate elétrico', 'Divertido, mas perde valor rápido e gasta bateria.', 'transporte', 1200, 1, -2.000, 30, 100, 15, 0, 0
    UNION ALL SELECT 'moto', 'Moto', 'Chega mais longe. Também perde valor e custa todo ciclo.', 'transporte', 3500, 1, -2.000, 30, 100, 40, 0, 0
    UNION ALL SELECT 'carro-popular', 'Carro popular', 'Confortável, mas é o campeão de custo: perde valor e cobra caro.', 'transporte', 8000, 1, -2.500, 40, 100, 90, 0, 0
    UNION ALL SELECT 'carro-esportivo', 'Carro esportivo', 'O mais rápido e o mais caro de manter. Pense bem antes.', 'transporte', 20000, 1, -3.000, 30, 100, 200, 0, 0
    UNION ALL SELECT 'garagem', 'Garagem', 'Lugar para guardar o que tem rodas. Valoriza junto com a casa.', 'transporte', 1000, 1, 0.300, 100, 200, 0, 0, 0

    UNION ALL SELECT 'fone-de-ouvido', 'Fone de ouvido', 'Som só para você. Perde valor rapidinho.', 'tecnologia', 150, 1, -2.000, 30, 100, 0, 0, 0
    UNION ALL SELECT 'celular', 'Celular', 'O que mais perde valor na loja. Ano que vem já vale bem menos.', 'tecnologia', 1500, 1, -4.000, 20, 100, 0, 0, 0
    UNION ALL SELECT 'tablet', 'Tablet', 'Tela grande para estudar e jogar. Perde valor rápido.', 'tecnologia', 2000, 1, -3.500, 30, 100, 0, 0, 0
    UNION ALL SELECT 'videogame', 'Videogame', 'Diversão garantida, com assinatura para pagar todo ciclo.', 'tecnologia', 2800, 1, -3.000, 30, 100, 20, 0, 0
    UNION ALL SELECT 'notebook', 'Notebook', 'Serve para tudo. Ainda assim perde valor com o tempo.', 'tecnologia', 4500, 1, -3.000, 30, 100, 0, 0, 0

    UNION ALL SELECT 'barraquinha-de-limonada', 'Barraquinha de limonada', 'Seu primeiro negócio: trabalha por você e traz mel toda semana.', 'negocios', 800, 1, 0.000, 100, 100, 0, 40, 0
    UNION ALL SELECT 'caixa-de-abelhas', 'Caixa de abelhas', 'Produz mel de verdade. Rende bem e pede um cuidado por ciclo.', 'negocios', 2000, 1, 0.000, 100, 100, 20, 120, 0
    UNION ALL SELECT 'loja-de-mel', 'Loja de mel', 'O maior negócio da colmeia. Renda alta, custo alto.', 'negocios', 6500, 1, 0.000, 100, 100, 80, 450, 0
    UNION ALL SELECT 'horta-comunitaria', 'Horta comunitária', 'Planta hoje, colhe todo ciclo. Precisa de terreno.', 'negocios', 3000, 1, 0.000, 100, 100, 40, 200, 0
    UNION ALL SELECT 'cofrinho-reforcado', 'Cofrinho reforçado', 'Deixa o seu cofre render 1 ponto percentual a mais por ciclo.', 'negocios', 1200, 1, 0.000, 100, 100, 0, 0, 0

    UNION ALL SELECT 'oculos-escuros', 'Óculos escuros', 'Estilo para o seu Beenie. Não muda seu patrimônio.', 'cosmeticos', 150, 0, 0.000, 100, 100, 0, 0, 0
    UNION ALL SELECT 'chapeu-de-explorador', 'Chapéu de explorador', 'Para encarar qualquer favo. Enfeite, não investimento.', 'cosmeticos', 200, 0, 0.000, 100, 100, 0, 0, 0
    UNION ALL SELECT 'antenas-coloridas', 'Antenas coloridas', 'Antenas de todas as cores. Só beleza.', 'cosmeticos', 250, 0, 0.000, 100, 100, 0, 0, 0
    UNION ALL SELECT 'moldura-de-avatar', 'Moldura de avatar', 'Uma borda especial na sua foto.', 'cosmeticos', 300, 0, 0.000, 100, 100, 0, 0, 0
    UNION ALL SELECT 'emote-de-comemoracao', 'Emote de comemoração', 'Comemore cada célula concluída com estilo.', 'cosmeticos', 350, 0, 0.000, 100, 100, 0, 0, 0
    UNION ALL SELECT 'capa-de-heroi', 'Capa de herói', 'Uma capa que voa junto com você.', 'cosmeticos', 400, 0, 0.000, 100, 100, 0, 0, 0
    UNION ALL SELECT 'tema-da-colmeia', 'Tema da colmeia', 'Muda o visual do app entre dia, noite e floresta.', 'cosmeticos', 500, 0, 0.000, 100, 100, 0, 0, 0
    UNION ALL SELECT 'trilha-sonora-alternativa', 'Trilha sonora alternativa', 'Outra música para acompanhar seus jogos.', 'cosmeticos', 600, 0, 0.000, 100, 100, 0, 0, 0
    UNION ALL SELECT 'asas-brilhantes', 'Asas brilhantes', 'Asas que brilham quando você sobe de nível.', 'cosmeticos', 900, 0, 0.000, 100, 100, 0, 0, 0
    UNION ALL SELECT 'skin-dourada', 'Skin dourada do mascote', 'O Beenie todo dourado. O cosmético mais raro.', 'cosmeticos', 1200, 0, 0.000, 100, 100, 0, 0, 0

    UNION ALL SELECT 'dica-extra', 'Dica Extra', 'Elimina uma alternativa errada no quiz. Vale uma vez.', 'utilitarios', 100, 0, 0.000, 100, 100, 0, 0, 1
    UNION ALL SELECT 'passe-de-revisao', 'Passe de Revisão', 'Repete uma célula com o mel valendo de novo. Vale uma vez.', 'utilitarios', 250, 0, 0.000, 100, 100, 0, 0, 1
    UNION ALL SELECT 'escudo-de-sequencia', 'Escudo de Sequência', 'Protege um dia marcado que você perdeu. Guarde até dois.', 'utilitarios', 400, 0, 0.000, 100, 100, 0, 0, 1
    UNION ALL SELECT 'mel-dobrado', 'Mel Dobrado (24 h)', 'Ganhe o dobro de mel por um dia inteiro.', 'utilitarios', 500, 0, 0.000, 100, 100, 0, 0, 1
  ) AS dados
  JOIN item_categories categoria ON categoria.slug = dados.categoria
ON DUPLICATE KEY UPDATE
  name = dados.nome, description_kid = dados.descricao, price = dados.preco,
  counts_in_patrimony = dados.patrimonio, valuation_rate = dados.taxa,
  valuation_floor_pct = dados.piso, valuation_cap_pct = dados.teto,
  upkeep_cost = dados.custo, income_per_cycle = dados.renda, is_consumable = dados.consumivel;

INSERT IGNORE INTO item_behaviors_map (item_id, behavior_id)
SELECT i.id, b.id
  FROM items i
  JOIN item_behaviors b ON (
       (b.slug = 'valoriza'   AND i.valuation_rate > 0)
    OR (b.slug = 'deprecia'   AND i.valuation_rate < 0)
    OR (b.slug = 'custo_fixo' AND i.upkeep_cost > 0)
    OR (b.slug = 'gera_renda' AND i.income_per_cycle > 0)
    OR (b.slug = 'neutro'     AND i.valuation_rate = 0 AND i.upkeep_cost = 0 AND i.income_per_cycle = 0)
  );

UPDATE items filho
  JOIN items pai ON pai.slug = 'casa-pequena'
   SET filho.upgrade_of_item_id = pai.id
 WHERE filho.slug = 'casa-media';

UPDATE items filho
  JOIN items pai ON pai.slug = 'casa-media'
   SET filho.upgrade_of_item_id = pai.id
 WHERE filho.slug = 'casa-grande';

CREATE TEMPORARY TABLE IF NOT EXISTS seed_requisitos (
  item          VARCHAR(60) NOT NULL,
  nivel         SMALLINT DEFAULT NULL,
  prerequisito  VARCHAR(60) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DELETE FROM seed_requisitos;

INSERT INTO seed_requisitos (item, nivel, prerequisito) VALUES
  ('casa-pequena',             5, NULL),
  ('terreno',                  8, NULL),
  ('skate-eletrico',           4, NULL),
  ('moto',                     6, NULL),
  ('carro-popular',            8, NULL),
  ('carro-esportivo',         12, NULL),
  ('barraquinha-de-limonada',  3, NULL),
  ('caixa-de-abelhas',         5, NULL),
  ('cofrinho-reforcado',       4, NULL),
  ('quarto-proprio',        NULL, 'cantinho-na-colmeia'),
  ('casa-media',            NULL, 'casa-pequena'),
  ('casa-grande',           NULL, 'casa-media'),
  ('garagem',               NULL, 'casa-pequena'),
  ('carro-popular',         NULL, 'garagem'),
  ('loja-de-mel',           NULL, 'caixa-de-abelhas'),
  ('horta-comunitaria',     NULL, 'terreno');

DELETE requisito
  FROM item_requirements requisito
  JOIN items i ON i.id = requisito.item_id
 WHERE i.slug IN (SELECT item FROM seed_requisitos);

INSERT INTO item_requirements (item_id, requirement_type_id, required_level)
SELECT i.id, t.id, dados.nivel
  FROM seed_requisitos dados
  JOIN items i ON i.slug = dados.item
  JOIN item_requirement_types t ON t.slug = 'nivel-minimo'
 WHERE dados.nivel IS NOT NULL;

INSERT INTO item_requirements (item_id, requirement_type_id, required_item_id)
SELECT i.id, t.id, pre.id
  FROM seed_requisitos dados
  JOIN items i ON i.slug = dados.item
  JOIN items pre ON pre.slug = dados.prerequisito
  JOIN item_requirement_types t ON t.slug = 'item-prerequisito'
 WHERE dados.prerequisito IS NOT NULL;

DROP TEMPORARY TABLE IF EXISTS seed_requisitos;
