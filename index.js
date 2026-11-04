// Importando as bibliotecas
const express = require('express');
const path = require('path');
const { MongoClient, ObjectId } = require('mongodb');

// Inicializa a aplicação Express
const app = express();

// Middleware para processar JSON com limite de tamanho de payload (proteção contra DoS)
app.use(express.json({ limit: '50kb' }));

// Middleware de proteção contra NoSQL / SQL Injection
// Remove chaves que comecem com '$' (operadores de injeção MongoDB) ou que contenham '.'
app.use((req, res, next) => {
    function sanitizar(obj) {
        if (!obj || typeof obj !== 'object') return obj;

        if (Array.isArray(obj)) {
            return obj.map(sanitizar);
        }

        const limpo = {};
        for (const chave of Object.keys(obj)) {
            // Bloqueia tentativas de injeção de operadores MongoDB (ex: $gt, $ne, $where) ou dot notation
            if (chave.startsWith('$') || chave.includes('.')) {
                console.warn(`[SEGURANÇA] Tentativa de injeção detectada e bloqueada no campo: "${chave}"`);
                continue; // Descarta a chave perigosa
            }
            limpo[chave] = sanitizar(obj[chave]);
        }
        return limpo;
    }

    if (req.body) req.body = sanitizar(req.body);
    if (req.query) req.query = sanitizar(req.query);
    if (req.params) req.params = sanitizar(req.params);

    next();
});

// Servindo os arquivos estáticos do front-end (pasta public)
app.use(express.static(path.join(__dirname, 'public')));

// Conectando ao Cluster MongoDB
const client = new MongoClient(process.env.MONGO_URI);

// Conectando ao banco e à coleção específica
const produtos = client.db('cantinaMVP').collection('produtos');

// =============================================================================
// FUNÇÕES AUXILIARES DE VALIDAÇÃO E SEGURANÇA
// =============================================================================

// Valida se o ID tem exatamente 24 caracteres hexadecimais (padrão ObjectId)
function validarId(id) {
    return typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id) && ObjectId.isValid(id);
}

// Filtra e valida os campos permitidos (Whitelist / Mass Assignment Protection)
function sanitizarProduto(dados) {
    if (!dados || typeof dados !== 'object') return null;

    const nome = typeof dados.nome === 'string' ? dados.nome.trim() : '';
    const categoria = typeof dados.categoria === 'string' ? dados.categoria.trim() : 'Outros';
    const preco = parseFloat(dados.preco);
    const quantidade = parseInt(dados.quantidade, 10);
    const descricao = typeof dados.descricao === 'string' ? dados.descricao.trim() : '';

    if (!nome || isNaN(preco) || preco < 0 || isNaN(quantidade) || quantidade < 0) {
        return null;
    }

    return {
        nome: nome.slice(0, 150),
        categoria: categoria.slice(0, 80),
        preco: Number(preco.toFixed(2)),
        quantidade: Math.max(0, quantidade),
        descricao: descricao.slice(0, 500)
    };
}

// =============================================================================
// ROTAS HTTP (CRUD SEGURO)
// =============================================================================

// 1. POST /produtos - Adiciona um novo produto
app.post('/produtos', async (req, res) => {
    try {
        const produtoSeguro = sanitizarProduto(req.body);

        if (!produtoSeguro) {
            return res.status(400).json({ erro: 'Dados inválidos. Verifique os campos obrigatórios.' });
        }

        produtoSeguro.dataCriacao = new Date().toISOString();

        const novo_produto = await produtos.insertOne(produtoSeguro);
        res.status(201).json(novo_produto);

    } catch (erro) {
        console.error('Erro ao inserir produto:', erro);
        res.status(500).json({ erro: 'Erro interno ao salvar o produto.' });
    }
});

// 2. GET /produtos - Lista todos os produtos
app.get('/produtos', async (req, res) => {
    try {
        const lista = await produtos.find().toArray();
        res.json(lista);
    } catch (erro) {
        console.error('Erro ao listar produtos:', erro);
        res.status(500).json({ erro: 'Erro interno ao listar produtos.' });
    }
});

// 3. GET /produtos/:id - Visualiza um produto específico por ID
app.get('/produtos/:id', async (req, res) => {
    try {
        const { id } = req.params;

        if (!validarId(id)) {
            return res.status(400).json({ erro: 'ID inválido. Deve possuir exatamente 24 caracteres hexadecimais.' });
        }

        const resultado = await produtos.findOne({ _id: new ObjectId(id) });

        if (!resultado) {
            return res.status(404).json(null);
        }

        res.json(resultado);

    } catch (erro) {
        console.error('Erro ao buscar produto por ID:', erro);
        res.status(500).json({ erro: 'Erro interno ao buscar produto.' });
    }
});

// 4. PUT /produtos/:id - Atualiza um produto específico por ID
app.put('/produtos/:id', async (req, res) => {
    try {
        const { id } = req.params;

        if (!validarId(id)) {
            return res.status(400).json({ erro: 'ID inválido. Deve possuir exatamente 24 caracteres hexadecimais.' });
        }

        const produtoSeguro = sanitizarProduto(req.body);

        if (!produtoSeguro) {
            return res.status(400).json({ erro: 'Dados inválidos para atualização.' });
        }

        produtoSeguro.dataAtualizacao = new Date().toISOString();

        // Atualiza apenas os campos permitidos e sanitizados
        const resultado = await produtos.updateOne(
            { _id: new ObjectId(id) },
            { $set: produtoSeguro }
        );

        res.json(resultado);

    } catch (erro) {
        console.error('Erro ao atualizar produto:', erro);
        res.status(500).json({ erro: 'Erro interno ao atualizar produto.' });
    }
});

// 5. DELETE /produtos/:id - Deleta um produto específico por ID
app.delete('/produtos/:id', async (req, res) => {
    try {
        const { id } = req.params;

        if (!validarId(id)) {
            return res.status(400).json({ erro: 'ID inválido. Deve possuir exatamente 24 caracteres hexadecimais.' });
        }

        const resultado = await produtos.deleteOne({ _id: new ObjectId(id) });
        res.json(resultado);

    } catch (erro) {
        console.error('Erro ao excluir produto:', erro);
        res.status(500).json({ erro: 'Erro interno ao excluir produto.' });
    }
});

// =============================================================================
// INICIANDO O SERVIDOR
// =============================================================================

client.connect()
    .then(() => {
        console.log('Conectado ao MONGODB com sucesso!');
        app.listen(3000, () => console.log('API rodando com segurança na porta 3000'));
    })
    .catch((erro) => console.log('Erro ao conectar ao MongoDB:', erro.message));
