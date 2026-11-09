const { pool } = require('../config/db');

async function obter() {
  const [[cardapio]] = await pool.query(
    'SELECT COUNT(*) AS total_itens FROM item_menu'
  );
  const [porTipo] = await pool.query('SELECT tipo_item, COUNT(*) AS total FROM item_menu GROUP BY tipo_item');
  const [[estoque]] = await pool.query(
    `SELECT COUNT(*) AS total_ingredientes,
            COALESCE(SUM(quantidade_em_estoque <= estoque_minimo), 0) AS abaixo_minimo
       FROM ingredientes`
  );
  const [alertas] = await pool.query(
    `SELECT id_ingrediente, descricao_ingrediente, unidade_medida, quantidade_em_estoque, estoque_minimo
       FROM ingredientes
      WHERE quantidade_em_estoque <= estoque_minimo
      ORDER BY quantidade_em_estoque / NULLIF(estoque_minimo, 0)`
  );
  const [ultimos] = await pool.query(
    `SELECT m.*, g.descricao_ingrediente, g.unidade_medida, t.descricao_tipo_movimento
       FROM movimento_de_estoque m
       JOIN ingredientes g ON g.id_ingrediente = m.id_ingrediente
       JOIN tipo_movimento t ON t.id_tipo_movimento = m.id_tipo_movimento
      ORDER BY m.sequencia_lancamento DESC
      LIMIT 6`
  );
  return {
    cardapio: { ...cardapio, por_tipo: porTipo },
    estoque: { ...estoque, abaixo_minimo: Number(estoque.abaixo_minimo) },
    alertas,
    ultimos,
  };
}

module.exports = { obter };
