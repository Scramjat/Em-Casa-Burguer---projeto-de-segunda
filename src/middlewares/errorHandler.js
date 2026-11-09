const AppError = require('../utils/AppError');

// eslint-disable-next-line no-unused-vars
module.exports = (err, req, res, next) => {
  if (err instanceof AppError) {
    return res.status(err.status).json({ erro: err.message });
  }
  if (err.code === 'ECONNREFUSED' || err.code === 'ER_ACCESS_DENIED_ERROR' || err.code === 'ER_BAD_DB_ERROR') {
    return res.status(503).json({ erro: 'Não foi possível conectar ao banco de dados. Verifique o MySQL e o arquivo .env.' });
  }
  console.error(err);
  res.status(500).json({ erro: 'Erro interno no servidor.' });
};
