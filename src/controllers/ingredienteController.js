const service = require('../services/ingredienteService');

module.exports = {
  listar: async (req, res) => res.json(await service.listar({ busca: req.query.busca, baixo: req.query.baixo === '1' })),
  obter: async (req, res) => res.json(await service.obter(req.params.id)),
  criar: async (req, res) => res.status(201).json(await service.criar(req.body)),
  atualizar: async (req, res) => res.json(await service.atualizar(req.params.id, req.body)),
  excluir: async (req, res) => { await service.excluir(req.params.id); res.status(204).end(); },
};
