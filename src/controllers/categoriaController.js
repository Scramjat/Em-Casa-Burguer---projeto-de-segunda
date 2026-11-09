const service = require('../services/categoriaService');

module.exports = {
  listar: async (req, res) => res.json(await service.listar()),
  criar: async (req, res) => res.status(201).json(await service.criar(req.body)),
  atualizar: async (req, res) => res.json(await service.atualizar(req.params.id, req.body)),
  excluir: async (req, res) => { await service.excluir(req.params.id); res.status(204).end(); },
};
