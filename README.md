# Cantina MVP — Cantina Sr. Leão (SENAI)

Aplicação web full-stack (backend + frontend em um único processo Node.js) para gerenciar o cardápio e o estoque da Cantina Sr. Leão do SENAI. Permite cadastrar, listar, buscar, atualizar e excluir produtos da cantina, persistindo os dados em um banco MongoDB.

O frontend é uma interface estática (HTML/CSS/JavaScript puro, sem build) servida pelo próprio backend Express na mesma origem, com tema claro/escuro, filtros em tempo real e notificações toast.

## Funcionalidades principais

- **CRUD completo de produtos** (`/produtos`): criar, listar, consultar por ID, atualizar e excluir.
- **Campos de um produto**: `nome`, `categoria`, `preco` (R$), `quantidade` (estoque), `descricao`, `dataCriacao` (automático) e `dataAtualizacao` (automático a cada PUT).
- **Filtros no cardápio**: busca por nome, categoria ou ID em tempo real + pílulas rápidas de categoria.
- **Busca por ID**: consulta direta pelo `_id` do MongoDB (24 caracteres hexadecimais), com validação no front e no back.
- **Validação e segurança**: whitelist de campos, validação de tipos e limites de tamanho, bloqueio de injeção NoSQL (chaves com `$` ou `.` são descartadas), limite de payload JSON de `50kb` e escape de HTML no frontend.
- **Interface**: navegação por abas com persistência (hash da URL + `localStorage`), modo escuro/claro, modal de edição, confirmação de exclusão, cópia do ID com um clique e badges de estoque (esgotado / baixo / ok).

Categorias oferecidas no formulário: `Salgados`, `Bebidas`, `Doces`, `Lanches Naturais`, `Refeições`, `Outros` (valores livres também são aceitos pela API, com padrão `Outros`).

## Pré-requisitos

| Ferramenta | Versão recomendada | Observações |
|---|---|---|
| [Node.js](https://nodejs.org/) | 20.6+ (testado com v24.21.0) | O comando `npm start` usa `node --env-file=.env`, disponível a partir do Node 20.6 |
| [npm](https://www.npmjs.com/) | 10+ (testado com 11.19.0) | Instalação das dependências |
| MongoDB | — | Banco remoto (Atlas) ou local; acessado via `MONGO_URI` (`TODO`: confirmar se a produção usa Atlas) |

Não há `engines` declarada no `package.json`; a versão mínima acima decorre do uso de `--env-file` no script de start.

## Instalação e configuração

```bash
git clone https://github.com/Pietro-Olimpio/Cantina-MVP.git
cd Cantina-MVP
npm install
```

Crie um arquivo `.env` na raiz do projeto (este arquivo **não** é versionado — está no `.gitignore`):

```env
MONGO_URI=mongodb+srv://usuario:senha@cluster.exemplo.net/?appName=cantina
```

### Variáveis de ambiente

| Variável | Obrigatória | Descrição |
|---|---|---|
| `MONGO_URI` | Sim | String de conexão do MongoDB usada em `new MongoClient(process.env.MONGO_URI)` (`index.js`). Sem ela, o servidor não conecta e não sobe. |

> Observação: a porta é fixa em **`3000`** no código (`app.listen(3000, ...)`). Não há variável `PORT`.

> `TODO`: criar um `.env.example` com a chave `MONGO_URI` para facilitar a configuração de novos desenvolvedores.

## Como executar

```bash
npm start
```

Isso executa `node --env-file=.env index.js`. Ao conectar com sucesso no MongoDB, o log mostra:

```
Conectado ao MONGODB com sucesso!
API rodando com segurança na porta 3000
```

Acesse a aplicação em **http://localhost:3000**. O frontend é servido na raiz (`/`) e a API em `/produtos`.

Bancos e coleções usados (fixos no código): banco **`cantinaMVP`**, coleção **`produtos`**.

## Como rodar os testes

Não há suíte de testes no projeto. O script atual é o padrão do `npm init`:

```bash
npm test
# → Error: no test specified
```

> `TODO`: adicionar uma suíte de testes (unitários/integração) e atualizar o script `test` no `package.json`.

## Exemplos de uso (API)

```bash
# Listar todos os produtos
curl http://localhost:3000/produtos

# Cadastrar um produto
curl -X POST http://localhost:3000/produtos \
  -H "Content-Type: application/json" \
  -d '{ "nome": "Coxinha de Frango", "categoria": "Salgados", "preco": 8.50, "quantidade": 20, "descricao": "Assada na hora" }'

# Buscar um produto pelo ID (24 caracteres hexadecimais)
curl http://localhost:3000/produtos/6735a123f890123456789abc

# Atualizar um produto
curl -X PUT http://localhost:3000/produtos/6735a123f890123456789abc \
  -H "Content-Type: application/json" \
  -d '{ "nome": "Coxinha de Frango", "categoria": "Salgados", "preco": 9.00, "quantidade": 15, "descricao": "" }'

# Excluir um produto
curl -X DELETE http://localhost:3000/produtos/6735a123f890123456789abc
```

### Endpoints

| Método | Rota | Descrição | Sucesso |
|---|---|---|---|
| `GET` | `/produtos` | Lista todos os produtos | `200` + array JSON |
| `POST` | `/produtos` | Cria um novo produto | `201` + documento inserido |
| `GET` | `/produtos/:id` | Busca um produto pelo `_id` | `200` + documento · `404` → `null` · `400` se ID inválido |
| `PUT` | `/produtos/:id` | Atualiza nome, categoria, preço, estoque e descrição | `200` + resultado do `updateOne` · `400` se ID ou dados inválidos |
| `DELETE` | `/produtos/:id` | Exclui um produto pelo `_id` | `200` + resultado do `deleteOne` · `400` se ID inválido |

Erros de servidor retornam `500` com `{ "erro": "..." }` no corpo.

Regras de validação aplicadas no backend (`sanitizarProduto` em `index.js`):

- `nome`: obrigatório, até 150 caracteres.
- `categoria`: até 80 caracteres; padrão `Outros`.
- `preco`: número `>= 0`, arredondado para 2 casas decimais.
- `quantidade`: inteiro `>= 0`.
- `descricao`: até 500 caracteres.
- `dataCriacao` e `dataAtualizacao` são definidos pelo servidor (ISO 8601); valores enviados pelo cliente nesses campos são ignorados.
- Chaves iniciadas por `$` ou contendo `.` são removidas (anti-injeção NoSQL), inclusive em `query` e `params`.

## Estrutura do projeto

```
Cantina-MVP/
├── index.js             # Backend: Express + MongoDB, rotas CRUD, validação e segurança
├── public/              # Frontend estático (servido por express.static)
│   ├── index.html       # Estrutura: navbar, abas (Início, Cadastrar, Produtos, Buscar), modal de edição
│   ├── script.js        # Lógica do frontend: CRUD via fetch, filtros, tema, toasts, abas
│   ├── style.css        # Estilos, variáveis CSS (tema claro/escuro) e layout responsivo
│   └── logo.png         # Logo/mascote da cantina
├── package.json         # Manifesto: scripts, dependências e metadados
├── package-lock.json    # Versões travadas das dependências
├── .gitignore           # Ignora .env e node_modules/
└── README.md
```

## Arquitetura resumida

```
┌────────────────────────────┐          ┌──────────────────────┐
│  Navegador (public/)       │  HTTP    │  index.js (Node)     │
│  HTML + CSS + JS puro      │ ───────▶ │  Express (porta 3000)│
│  fetch → /produtos         │ ◀─────── │  express.static +    │
└────────────────────────────┘   JSON   │  API REST            │
                                        └──────────┬───────────┘
                                                   │ mongodb driver
                                        ┌──────────▼───────────┐
                                        │  MongoDB             │
                                        │  db: cantinaMVP      │
                                        │  col: produtos       │
                                        └──────────────────────┘
```

- **Backend** (`index.js`, CommonJS): um único arquivo com o servidor Express, middlewares de segurança (limite de payload e sanitização anti-injeção), funções de validação (`validarId`, `sanitizarProduto`) e as cinco rotas CRUD. A conexão com o MongoDB é feita uma vez na inicialização via `MongoClient` do driver oficial; o servidor só escuta após conectar.
- **Frontend** (`public/`): sem framework ou etapa de build. `script.js` mantém o estado em memória (`todosOsProdutos`, `categoriaAtiva`), usa `localStorage` para tema e aba ativa e consome a API com `fetch`. O escape de HTML (`escapeHtml`) evita XSS ao renderizar dados da API.
- **Banco de dados**: MongoDB, manipulação direta com o driver oficial (sem ORM). Cada produto é um documento da coleção `produtos`, com o `_id` nativo (`ObjectId`) do MongoDB.

## Como contribuir

1. Faça um fork e crie uma branch para sua alteração: `git checkout -b minha-alteracao`.
2. Instale as dependências com `npm install` e crie o `.env` com seu `MONGO_URI` de desenvolvimento.
3. Faça as alterações mantendo o estilo atual (CommonJS no backend, vanilla JS no frontend, sem build).
4. Teste manualmente: `npm start` e valide as rotas/superfície alteradas no navegador ou com `curl`.
5. Abra um Pull Request descrevendo o que foi feito e como foi testado.

## Licença

`package.json` declara a licença **ISC**. Não há arquivo `LICENSE` no repositório.

> `TODO`: confirmar a licença pretendida e adicionar o arquivo `LICENSE` correspondente.

## Contato / mantenedores

Repositório: [https://github.com/Pietro-Olimpio/Cantina-MVP](https://github.com/Pietro-Olimpio/Cantina-MVP) · Issues: [https://github.com/Pietro-Olimpio/Cantina-MVP/issues](https://github.com/Pietro-Olimpio/Cantina-MVP/issues)

> `TODO`: adicionar nomes de mantenedores e um canal de contato (e-mail ou) caso existam.
