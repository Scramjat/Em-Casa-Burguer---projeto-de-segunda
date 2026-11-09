-- =====================================================================
--  Em Casa Burguer - Piracicaba
--  Banco de dados (BD1 -> POO -> Aplicação Web)
--
--  Baseado no modelo original da disciplina de BD1. Extensões feitas
--  para a aplicação Web (marcadas com [WEB]):
--    * item_menu.detalhes_item      -> descrição/ingredientes do item
--    * ingredientes.unidade_medida  -> un, kg, g, L, ml...
--    * ingredientes.estoque_minimo  -> alerta de estoque baixo
--    * categoria_item (nova) + FK item_menu.tipo_item -> categorias cadastráveis
--    * requer -> ON DELETE CASCADE ao excluir um item do cardápio
--    * ingredientes.preco_de_compra DEFAULT 0 (financeiro fora do escopo por enquanto)
--    * dados iniciais: apenas os tipos de movimento (sistema começa zerado)
-- =====================================================================

DROP DATABASE IF EXISTS emcasaburger;
CREATE DATABASE emcasaburger;
USE emcasaburger;

-- 1. Tipos de movimento de estoque
CREATE TABLE tipo_movimento (
    id_tipo_movimento VARCHAR(3) NOT NULL,
    descricao_tipo_movimento VARCHAR(40) NOT NULL,
    PRIMARY KEY (id_tipo_movimento)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- 2. Ingredientes (estoque)
CREATE TABLE ingredientes (
    id_ingrediente INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    descricao_ingrediente VARCHAR(50) NOT NULL,
    unidade_medida VARCHAR(10) NOT NULL DEFAULT 'un',          -- [WEB]
    preco_de_compra DECIMAL(8, 2) NOT NULL DEFAULT 0,          -- [WEB] financeiro fora do escopo por enquanto
    quantidade_em_estoque DECIMAL(8, 2) NOT NULL,
    estoque_minimo DECIMAL(8, 2) NOT NULL DEFAULT 0,           -- [WEB]
    PRIMARY KEY (id_ingrediente)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- 3a. [WEB] Categorias do cardápio
--     grupo_categoria agrupa subcategorias (ex.: Hambúrguer -> Smash, Tradicional).
--     padrao = 1 marca as categorias exigidas pelo enunciado (grupo fixo; podem ser excluídas se vazias).
CREATE TABLE categoria_item (
    id_categoria VARCHAR(30) NOT NULL,
    nome_categoria VARCHAR(30) NOT NULL,
    grupo_categoria VARCHAR(30) NULL,
    ordem INTEGER NOT NULL DEFAULT 0,
    padrao TINYINT(1) NOT NULL DEFAULT 0,
    PRIMARY KEY (id_categoria)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- 3b. Itens do cardápio (tipo_item -> categoria_item.id_categoria)
CREATE TABLE item_menu (
    id_item INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    descricao_item VARCHAR(50) NOT NULL,
    detalhes_item VARCHAR(255) NULL,                           -- [WEB]
    preco_de_venda DECIMAL(8, 2) NOT NULL,
    tipo_item VARCHAR(30) NOT NULL,
    PRIMARY KEY (id_item),
    CONSTRAINT fk_item_categoria FOREIGN KEY (tipo_item)              -- [WEB]
        REFERENCES categoria_item(id_categoria)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- 4. Ficha técnica: ingredientes que cada item requer
CREATE TABLE requer (
    id_item INTEGER UNSIGNED NOT NULL,
    id_ingrediente INTEGER UNSIGNED NOT NULL,
    quantidade_requerida DECIMAL(8, 2) NOT NULL,
    PRIMARY KEY (id_item, id_ingrediente),
    CONSTRAINT fk_requer_item FOREIGN KEY (id_item)
        REFERENCES item_menu(id_item) ON DELETE CASCADE,       -- [WEB]
    CONSTRAINT fk_requer_ingrediente FOREIGN KEY (id_ingrediente)
        REFERENCES ingredientes(id_ingrediente)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- 5. Movimentos de estoque (histórico)
CREATE TABLE movimento_de_estoque (
    sequencia_lancamento INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    data_movimento DATE NOT NULL,
    id_ingrediente INTEGER UNSIGNED NOT NULL,
    id_tipo_movimento VARCHAR(3) NOT NULL,
    quantidade_movida DECIMAL(8, 2) NOT NULL,
    saldo_anterior DECIMAL(8, 2) NOT NULL,
    saldo_posterior DECIMAL(8, 2) NOT NULL,
    PRIMARY KEY (sequencia_lancamento),
    CONSTRAINT fk_movimento_ingrediente FOREIGN KEY (id_ingrediente)
        REFERENCES ingredientes(id_ingrediente),
    CONSTRAINT fk_movimento_tipo FOREIGN KEY (id_tipo_movimento)
        REFERENCES tipo_movimento(id_tipo_movimento)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- =====================================================================
--  Dados iniciais
-- =====================================================================

-- ENT e AJP somam ao estoque; SAI, VEN, AJN e PER subtraem.
INSERT INTO tipo_movimento (id_tipo_movimento, descricao_tipo_movimento) VALUES
    ('ENT', 'Entrada (compra)'),
    ('SAI', 'Saída (uso interno)'),
    ('VEN', 'Saída por venda'),
    ('AJP', 'Ajuste de inventário (+)'),
    ('AJN', 'Ajuste de inventário (-)'),
    ('PER', 'Perda / descarte');

INSERT INTO categoria_item (id_categoria, nome_categoria, grupo_categoria, ordem, padrao) VALUES
    ('HAMBURGUER_SMASH',       'Smash',          'Hambúrguer', 10, 1),
    ('HAMBURGUER_TRADICIONAL', 'Tradicional',    'Hambúrguer', 20, 1),
    ('ACOMPANHAMENTO',         'Acompanhamento', NULL,         30, 1),
    ('BEBIDA',                 'Bebida',         NULL,         40, 1),
    ('SOBREMESA',              'Sobremesa',      NULL,         50, 1);
