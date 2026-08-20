

CREATE TABLE usuario (
  id           INT NOT NULL AUTO_INCREMENT,
  nome         VARCHAR(255) NOT NULL,
  email        VARCHAR(190) NOT NULL,
  data_nasc    DATE NOT NULL,
  senha        VARCHAR(255) NOT NULL,
  status       ENUM('Ativo','Inativo') NOT NULL DEFAULT 'Ativo',
  data_criacao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ultimo_login DATETIME DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_usuario_email (email),
  KEY idx_usuario_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE admin (
  id_admin     INT NOT NULL AUTO_INCREMENT,
  user_id_user INT NOT NULL,
  data_criacao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_admin),
  UNIQUE KEY uq_admin_usuario (user_id_user),
  CONSTRAINT fk_admin_usuario FOREIGN KEY (user_id_user) REFERENCES usuario (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE perfil (
  id           INT NOT NULL AUTO_INCREMENT,
  id_usuario   INT NOT NULL,
  apelido      VARCHAR(100) NOT NULL,
  avatar_img   VARCHAR(255) DEFAULT NULL,
  moedas       INT NOT NULL DEFAULT 0,
  pontos       INT NOT NULL DEFAULT 0,
  data_criacao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_perfil_usuario (id_usuario),
  CONSTRAINT fk_perfil_usuario FOREIGN KEY (id_usuario) REFERENCES usuario (id) ON DELETE CASCADE,
  CONSTRAINT ck_perfil_moedas CHECK (moedas >= 0),
  CONSTRAINT ck_perfil_pontos CHECK (pontos >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE sessions (
  session_id VARCHAR(128) COLLATE utf8mb4_bin NOT NULL,
  expires    INT UNSIGNED NOT NULL,
  data       MEDIUMTEXT COLLATE utf8mb4_bin,
  PRIMARY KEY (session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


CREATE TABLE nivel (
  id               INT NOT NULL AUTO_INCREMENT,
  id_perfil        INT NOT NULL,
  nivel            INT NOT NULL DEFAULT 1,
  xp_atual         INT NOT NULL DEFAULT 0,
  xp_proximo_nivel INT NOT NULL DEFAULT 1000,
  PRIMARY KEY (id),
  UNIQUE KEY uq_nivel_perfil (id_perfil),
  CONSTRAINT fk_nivel_perfil FOREIGN KEY (id_perfil) REFERENCES perfil (id) ON DELETE CASCADE,
  CONSTRAINT ck_nivel_valores CHECK (nivel >= 1 AND xp_atual >= 0 AND xp_proximo_nivel > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE conteudo (
  id                INT NOT NULL AUTO_INCREMENT,
  id_admin_criador  INT DEFAULT NULL,
  titulo            VARCHAR(255) NOT NULL,
  descricao         VARCHAR(500) NOT NULL,
  corpo             TEXT NOT NULL,
  data_publicacao   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_conteudo_admin (id_admin_criador),
  CONSTRAINT fk_conteudo_admin FOREIGN KEY (id_admin_criador) REFERENCES admin (id_admin) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE jogo (
  id          INT NOT NULL AUTO_INCREMENT,
  id_conteudo INT NOT NULL,
  nome        VARCHAR(255) NOT NULL,
  min_score   INT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_jogo_conteudo (id_conteudo),
  CONSTRAINT fk_jogo_conteudo FOREIGN KEY (id_conteudo) REFERENCES conteudo (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE sessao_jogo (
  id             INT NOT NULL AUTO_INCREMENT,
  id_perfil      INT NOT NULL,
  id_jogo        INT NOT NULL,
  data_inicio    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  data_fim       DATETIME DEFAULT NULL,
  duracao_seg    INT DEFAULT NULL,
  pontos_obtidos INT NOT NULL DEFAULT 0,
  moedas_ganhas  INT NOT NULL DEFAULT 0,
  xp_obtido      INT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_sessao_jogo_perfil (id_perfil),
  KEY idx_sessao_jogo_jogo (id_jogo),
  CONSTRAINT fk_sessao_jogo_perfil FOREIGN KEY (id_perfil) REFERENCES perfil (id) ON DELETE CASCADE,
  CONSTRAINT fk_sessao_jogo_jogo FOREIGN KEY (id_jogo) REFERENCES jogo (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


CREATE TABLE item (
  id               INT NOT NULL AUTO_INCREMENT,
  id_admin_criador INT DEFAULT NULL,
  nome             VARCHAR(255) NOT NULL,
  descricao        VARCHAR(500) NOT NULL,
  preco            INT NOT NULL,
  categoria        VARCHAR(50) NOT NULL,
  status           ENUM('Ativo','Desativado') NOT NULL DEFAULT 'Ativo',
  data_criacao     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_item_admin (id_admin_criador),
  KEY idx_item_categoria_status (categoria, status),
  CONSTRAINT fk_item_admin FOREIGN KEY (id_admin_criador) REFERENCES admin (id_admin) ON DELETE SET NULL,
  CONSTRAINT ck_item_preco CHECK (preco >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE compra (
  id              INT NOT NULL AUTO_INCREMENT,
  id_perfil       INT NOT NULL,
  id_item         INT NOT NULL,
  quantidade      INT NOT NULL DEFAULT 1,
  preco_unitario  INT NOT NULL,
  preco_total     INT NOT NULL,
  data_compra     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_compra_perfil (id_perfil),
  KEY idx_compra_item (id_item),
  CONSTRAINT fk_compra_perfil FOREIGN KEY (id_perfil) REFERENCES perfil (id) ON DELETE CASCADE,
  CONSTRAINT fk_compra_item FOREIGN KEY (id_item) REFERENCES item (id) ON DELETE RESTRICT,
  CONSTRAINT ck_compra_valores CHECK (quantidade > 0 AND preco_unitario >= 0 AND preco_total >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE inventario (
  id              INT NOT NULL AUTO_INCREMENT,
  id_perfil       INT NOT NULL,
  id_item         INT NOT NULL,
  quantidade      INT NOT NULL DEFAULT 1,
  data_aquisicao  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_inventario_perfil_item (id_perfil, id_item),
  KEY idx_inventario_item (id_item),
  CONSTRAINT fk_inventario_perfil FOREIGN KEY (id_perfil) REFERENCES perfil (id) ON DELETE CASCADE,
  CONSTRAINT fk_inventario_item FOREIGN KEY (id_item) REFERENCES item (id) ON DELETE RESTRICT,
  CONSTRAINT ck_inventario_quantidade CHECK (quantidade > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


CREATE TABLE cronograma (
  id          INT NOT NULL AUTO_INCREMENT,
  id_perfil   INT NOT NULL,
  descricao   VARCHAR(255) NOT NULL,
  data_inicio DATE NOT NULL,
  data_fim    DATE NOT NULL,
  horario     TIME DEFAULT NULL,
  dia         DATE DEFAULT NULL,
  PRIMARY KEY (id),
  KEY idx_cronograma_perfil (id_perfil),
  CONSTRAINT fk_cronograma_perfil FOREIGN KEY (id_perfil) REFERENCES perfil (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE meta (
  id            INT NOT NULL AUTO_INCREMENT,
  id_cronograma INT NOT NULL,
  titulo        VARCHAR(255) NOT NULL,
  descricao     VARCHAR(500) NOT NULL,
  data_criacao  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  data_final    DATE NOT NULL,
  status        ENUM('Ativo','Desativado') NOT NULL DEFAULT 'Ativo',
  PRIMARY KEY (id),
  KEY idx_meta_cronograma (id_cronograma),
  CONSTRAINT fk_meta_cronograma FOREIGN KEY (id_cronograma) REFERENCES cronograma (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE tarefa (
  id           INT NOT NULL AUTO_INCREMENT,
  id_meta      INT NOT NULL,
  id_perfil    INT NOT NULL,
  titulo       VARCHAR(255) NOT NULL,
  descricao    VARCHAR(500) NOT NULL,
  data_criacao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  data_inicio  DATE NOT NULL,
  data_prazo   DATE NOT NULL,
  status       ENUM('Ativo','Desativado') NOT NULL DEFAULT 'Ativo',
  prioridade   ENUM('Baixa','Media','Alta') NOT NULL DEFAULT 'Media',
  progresso    FLOAT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_tarefa_meta (id_meta),
  KEY idx_tarefa_perfil (id_perfil),
  CONSTRAINT fk_tarefa_meta FOREIGN KEY (id_meta) REFERENCES meta (id) ON DELETE CASCADE,
  CONSTRAINT fk_tarefa_perfil FOREIGN KEY (id_perfil) REFERENCES perfil (id) ON DELETE CASCADE,
  CONSTRAINT ck_tarefa_progresso CHECK (progresso >= 0 AND progresso <= 100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


CREATE TABLE auditoria (
  id               BIGINT NOT NULL AUTO_INCREMENT,
  ator_tipo        ENUM('Usuario','Admin','Sistema') NOT NULL,
  ator_id          INT DEFAULT NULL,
  acao             VARCHAR(100) NOT NULL,
  entidade         VARCHAR(50) NOT NULL,
  entidade_id      INT DEFAULT NULL,
  estado_anterior  JSON DEFAULT NULL,
  estado_novo      JSON DEFAULT NULL,
  criado_em        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_auditoria_entidade (entidade, entidade_id),
  KEY idx_auditoria_ator (ator_tipo, ator_id),
  KEY idx_auditoria_criado_em (criado_em)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
