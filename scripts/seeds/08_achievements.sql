
INSERT INTO achievements (slug, name, description, reward_coins) VALUES
  ('sequencia-7',   'Uma semana inteira',  'Sete dias seguidos de colmeia. O começo de tudo.',        100),
  ('sequencia-14',  'Duas semanas',        'Catorze dias seguidos. Já virou hábito.',                 200),
  ('sequencia-30',  'Um mês de constância','Trinta dias seguidos. Dá para comprar um Escudo com isso.',400),
  ('sequencia-60',  'Dois meses firmes',   'Sessenta dias seguidos. Pouca gente chega aqui.',          800),
  ('sequencia-100', 'Cem dias',            'Cem dias seguidos. Você é lenda da colmeia.',             1500)
AS novo
ON DUPLICATE KEY UPDATE
  name = novo.name, description = novo.description, reward_coins = novo.reward_coins;
