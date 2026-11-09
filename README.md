# Em Casa Burguer — Gestão de Cardápio e Estoque

Aplicação Web do restaurante **Em Casa Burguer (Piracicaba)**, continuação do projeto de BD1 (modelo do banco) e POO.

- **Cardápio**: cadastrar, editar, excluir e buscar itens (nome, preço, descrição) nas categorias
  **Hambúrguer Smash**, **Hambúrguer Tradicional**, **Acompanhamento**, **Bebida** e **Sobremesa**.
  Cada item tem uma **ficha técnica** (tabela `requer`) com os ingredientes usados por unidade.
  Também é possível **criar categorias novas** (ex.: Porções, Combos) ou novos tipos dentro de um grupo
  (ex.: um hambúrguer "Vegano" ao lado de Smash e Tradicional). Qualquer categoria sem itens pode ser excluída.
- **Estoque**: cadastro de ingredientes (nome, unidade, quantidade, estoque mínimo),
  com alerta de reposição.
- **Movimentações**: entradas, saídas, ajustes e perdas, com saldo anterior/posterior
  (tabela `movimento_de_estoque`). **Registrar venda** de um item dá baixa automática nos ingredientes.

## Tecnologias

Node.js + Express 5 · MySQL/MariaDB (`mysql2`) · HTML, CSS e JavaScript puro no front-end.

## Como rodar

1. Inicie o MySQL pelo XAMPP.
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Copie `.env.example` para `.env` e ajuste usuário/senha do banco se necessário.
4. Crie o banco vazio (**apaga o banco `emcasaburger` se ele já existir**):
   ```bash
   npm run db:init
   ```
5. Inicie o servidor e acesse <http://localhost:3000>:
   ```bash
   npm start
   ```

## Arquitetura (camadas)

```
public/                 Front-end (SPA com rotas por hash)
  js/api.js             Cliente da API REST
  js/app.js             Telas: Painel, Cardápio, Estoque, Movimentações
src/
  server.js             Configuração do Express
  routes/               Mapeamento URL -> controller
  controllers/          Recebem a requisição HTTP e devolvem JSON
  services/             Regras de negócio e validações (transações, saldo, ficha técnica)
  repositories/         SQL (acesso ao banco)
  config/db.js          Pool de conexões + helper de transação
  middlewares/          Tratamento centralizado de erros
database/schema.sql     Modelo do BD1 + extensões [WEB] + tipos de movimento
```

### Regras de negócio principais

- A quantidade em estoque **só muda por movimento**: cada lançamento trava a linha do ingrediente
  (`SELECT ... FOR UPDATE`), grava saldo anterior/posterior e atualiza o estoque na mesma transação.
- `ENT` e `AJP` somam ao estoque; `SAI`, `VEN`, `AJN` e `PER` subtraem. O saldo nunca fica negativo.
- A venda de um item lança um `VEN` por ingrediente da ficha técnica. Se faltar algum, nada é gravado (rollback).
- Um ingrediente usado em alguma ficha técnica não pode ser excluído.

### Extensões ao modelo do BD1

| Tabela | Coluna | Motivo |
|---|---|---|
| `categoria_item` (nova) | `id_categoria`, `nome_categoria`, `grupo_categoria`, `ordem`, `padrao` | categorias cadastráveis; `item_menu.tipo_item` vira FK para ela |
| `item_menu` | `detalhes_item` | descrição do item no cardápio |
| `ingredientes` | `unidade_medida` | un, kg, L… |
| `ingredientes` | `estoque_minimo` | alerta de reposição |
| `ingredientes` | `preco_de_compra DEFAULT 0` | parte financeira fora do escopo por enquanto |
| `requer` | `ON DELETE CASCADE` | excluir item remove a ficha técnica |

## API REST

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/resumo` | indicadores do painel |
| GET/POST | `/api/categorias` | lista / cria categorias |
| PUT/DELETE | `/api/categorias/:id` | renomeia / exclui (só categorias sem itens) |
| GET | `/api/itens?tipo=&busca=` | lista itens do cardápio |
| GET/POST/PUT/DELETE | `/api/itens/:id` | CRUD de item (com `ingredientes`) |
| POST | `/api/itens/:id/vender` | `{ quantidade }` dá baixa no estoque |
| GET | `/api/ingredientes?busca=&baixo=1` | lista ingredientes |
| GET/POST/PUT/DELETE | `/api/ingredientes/:id` | CRUD de ingrediente |
| GET | `/api/movimentos?ingrediente=&tipo=` | histórico |
| POST | `/api/movimentos` | lança movimento |
| GET | `/api/tipos-movimento` | tabela auxiliar |
