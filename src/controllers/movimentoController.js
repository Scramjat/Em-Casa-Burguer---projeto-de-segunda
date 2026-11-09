const service = require('../services/movimentoService');
const resumoService = require('../services/resumoService');

module.exports = {
  listar: async (req, res) => res.json(await service.listar({
    ingrediente: req.query.ingrediente, tipo: req.query.tipo, limite: req.query.limite,
  })),
  tipos: async (req, res) => res.json(await service.listarTipos()),
  registrar: async (req, res) => res.status(201).json(await service.registrar(req.body)),
  resumo: async (req, res) => res.json(await resumoService.obter()),
};
