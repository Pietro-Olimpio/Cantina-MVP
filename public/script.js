/**
 * Cantina Sr. Leão - Frontend CRUD Script
 * Gerencia navegação de abas (com persistência ao atualizar F5), filtros, tema claro/escuro e API REST.
 */

// Estado global da aplicação
let todosOsProdutos = [];
let categoriaAtiva = '';

// =============================================================================
// GERENCIADOR DE TEMA CLARO / ESCURO (DARK MODE)
// =============================================================================

const themeToggleBtn = document.getElementById('theme-toggle-btn');

function aplicarTema(tema) {
    document.documentElement.setAttribute('data-theme', tema);
    localStorage.setItem('cantina_theme', tema);
}

// Carrega preferência salva ou detecta preferência do sistema
const temaSalvo = localStorage.getItem('cantina_theme') || 
    (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
aplicarTema(temaSalvo);

if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
        const temaAtual = document.documentElement.getAttribute('data-theme') || 'light';
        const novoTema = temaAtual === 'dark' ? 'light' : 'dark';
        aplicarTema(novoTema);
    });
}

// =============================================================================
// NAVEGAÇÃO ENTRE ABAS COM PERSISTÊNCIA (URL HASH E LOCALSTORAGE)
// =============================================================================

const tabHashMap = {
    'tab-welcome': 'inicio',
    'tab-create': 'cadastrar',
    'tab-list': 'produtos',
    'tab-search': 'buscar'
};

const hashTabMap = {
    'inicio': 'tab-welcome',
    'cadastrar': 'tab-create',
    'produtos': 'tab-list',
    'buscar': 'tab-search',
    'tab-welcome': 'tab-welcome',
    'tab-create': 'tab-create',
    'tab-list': 'tab-list',
    'tab-search': 'tab-search'
};

function switchTab(tabId, updateHistory = true) {
    const pane = document.getElementById(tabId);
    if (!pane) return;

    // Atualiza botões da barra de navegação
    document.querySelectorAll('.nav-btn').forEach(btn => {
        if (btn.getAttribute('data-tab') === tabId) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // Alterna a exibição das seções
    document.querySelectorAll('.tab-pane').forEach(p => {
        if (p.id === tabId) {
            p.classList.add('active');
        } else {
            p.classList.remove('active');
        }
    });

    // Salva a aba ativa no localStorage para persistir mesmo após F5
    localStorage.setItem('cantina_active_tab', tabId);

    // Atualiza a hash na URL se solicitado (sem recarregar)
    if (updateHistory && tabHashMap[tabId]) {
        const hash = '#' + tabHashMap[tabId];
        if (window.location.hash !== hash) {
            history.replaceState(null, '', hash);
        }
    }

    // Se navegou para a lista, carrega ou filtra
    if (tabId === 'tab-list') {
        if (!todosOsProdutos || todosOsProdutos.length === 0) {
            carregarProdutos();
        } else {
            filtrarTabela();
        }
    }

    // Scroll suave para o topo
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Restaura a aba ativa ao carregar a página
function restaurarAbaAtiva() {
    // 1. Tenta pegar pela hash da URL (ex: #produtos, #cadastrar, #buscar)
    const hashAtual = window.location.hash.replace('#', '').toLowerCase();
    if (hashAtual && hashTabMap[hashAtual]) {
        switchTab(hashTabMap[hashAtual], false);
        return;
    }

    // 2. Se não houver hash, tenta pegar do localStorage
    const abaSalva = localStorage.getItem('cantina_active_tab');
    if (abaSalva && document.getElementById(abaSalva)) {
        switchTab(abaSalva, true);
        return;
    }

    // 3. Padrão: início
    switchTab('tab-welcome', true);
}

// Configura os ouvintes de clique nos botões de abas
document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const targetTab = btn.getAttribute('data-tab');
        switchTab(targetTab);
    });
});

// Suporte aos botões voltar/avançar do navegador
window.addEventListener('hashchange', () => {
    const hashAtual = window.location.hash.replace('#', '').toLowerCase();
    if (hashAtual && hashTabMap[hashAtual]) {
        switchTab(hashTabMap[hashAtual], false);
    }
});

// =============================================================================
// NAVEGAÇÃO RÁPIDA POR CATEGORIA (AO CLICAR NOS CARDS DA HOME)
// =============================================================================

async function navegarParaCategoria(categoria) {
    switchTab('tab-list');
    atualizarPilulaAtiva(categoria);
    categoriaAtiva = categoria;

    if (inputFiltro) {
        inputFiltro.value = categoria;
    }
    if (btnLimparFiltro) {
        btnLimparFiltro.style.display = 'block';
    }

    if (!todosOsProdutos || todosOsProdutos.length === 0) {
        await carregarProdutos();
    } else {
        filtrarTabela();
    }
}

// =============================================================================
// SISTEMA DE NOTIFICAÇÕES (TOAST)
// =============================================================================

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let iconSvg = '';
    if (type === 'success') {
        iconSvg = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
        `;
    } else if (type === 'error') {
        iconSvg = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="15" y1="9" x2="9" y2="15"></line>
                <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>
        `;
    } else {
        iconSvg = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
        `;
    }

    toast.innerHTML = `
        <span class="toast-icon-wrap">${iconSvg}</span>
        <span>${escapeHtml(message)}</span>
    `;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// =============================================================================
// CRUD: 1. CADASTRAR PRODUTO (POST /produtos)
// =============================================================================

const formCadastrar = document.getElementById('form-cadastrar');
formCadastrar.addEventListener('submit', async (e) => {
    e.preventDefault();

    const nome = document.getElementById('cad-nome').value.trim();
    const categoria = document.getElementById('cad-categoria').value.trim();
    const preco = parseFloat(document.getElementById('cad-preco').value);
    const quantidade = parseInt(document.getElementById('cad-quantidade').value, 10);
    const descricao = document.getElementById('cad-descricao').value.trim();

    if (!nome || !categoria || isNaN(preco) || isNaN(quantidade)) {
        showToast('Por favor, preencha todos os campos obrigatórios.', 'error');
        return;
    }

    const novoProduto = {
        nome,
        categoria,
        preco,
        quantidade,
        descricao,
        dataCriacao: new Date().toISOString()
    };

    try {
        const response = await fetch('/produtos', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(novoProduto)
        });

        if (!response.ok) {
            throw new Error(`Erro no servidor: ${response.status}`);
        }

        showToast(`Produto "${nome}" cadastrado com sucesso!`, 'success');
        formCadastrar.reset();

        // Leva o usuário para a lista de produtos
        setTimeout(() => {
            switchTab('tab-list');
            carregarProdutos();
        }, 500);

    } catch (erro) {
        console.error('Erro ao cadastrar produto:', erro);
        showToast('Não foi possível cadastrar o produto. Verifique a conexão com o servidor.', 'error');
    }
});

// =============================================================================
// CRUD: 2. LISTAR TODOS OS PRODUTOS (GET /produtos)
// =============================================================================

const tabelaCorpo = document.getElementById('tabela-produtos-corpo');
const listaVazia = document.getElementById('lista-vazia');
const listaLoading = document.getElementById('lista-loading');
const totalBadge = document.getElementById('total-produtos-badge');
const btnAtualizarLista = document.getElementById('btn-atualizar-lista');
const inputFiltro = document.getElementById('filtro-busca');
const btnLimparFiltro = document.getElementById('btn-limpar-filtro');
const pillsContainer = document.getElementById('category-pills');

btnAtualizarLista.addEventListener('click', carregarProdutos);

// Filtro de texto em tempo real
inputFiltro.addEventListener('input', () => {
    if (inputFiltro.value.trim().length > 0) {
        btnLimparFiltro.style.display = 'block';
    } else {
        btnLimparFiltro.style.display = 'none';
    }
    filtrarTabela();
});

// Botão para limpar busca rápida
btnLimparFiltro.addEventListener('click', () => {
    inputFiltro.value = '';
    btnLimparFiltro.style.display = 'none';
    categoriaAtiva = '';
    atualizarPilulaAtiva('');
    filtrarTabela();
});

// Pílulas de filtro por categoria
if (pillsContainer) {
    pillsContainer.querySelectorAll('.pill').forEach(pill => {
        pill.addEventListener('click', () => {
            const cat = pill.getAttribute('data-cat');
            categoriaAtiva = cat;
            atualizarPilulaAtiva(cat);

            if (cat) {
                inputFiltro.value = cat;
                btnLimparFiltro.style.display = 'block';
            } else {
                inputFiltro.value = '';
                btnLimparFiltro.style.display = 'none';
            }
            filtrarTabela();
        });
    });
}

function atualizarPilulaAtiva(cat) {
    if (!pillsContainer) return;
    pillsContainer.querySelectorAll('.pill').forEach(pill => {
        if (pill.getAttribute('data-cat') === cat) {
            pill.classList.add('active');
        } else {
            pill.classList.remove('active');
        }
    });
}

async function carregarProdutos() {
    listaLoading.style.display = 'block';
    listaVazia.style.display = 'none';
    tabelaCorpo.innerHTML = '';

    try {
        const response = await fetch('/produtos');
        if (!response.ok) {
            throw new Error(`Erro na requisição: ${response.status}`);
        }

        todosOsProdutos = await response.json();
        filtrarTabela();

    } catch (erro) {
        console.error('Erro ao listar produtos:', erro);
        showToast('Erro ao carregar cardápio de produtos.', 'error');
        listaVazia.style.display = 'block';
        listaVazia.querySelector('h3').textContent = 'Erro ao carregar cardápio';
        listaVazia.querySelector('p').textContent = 'Verifique se o servidor e o MongoDB estão conectados.';
    } finally {
        listaLoading.style.display = 'none';
    }
}

function formatarPreco(valor) {
    const num = Number(valor) || 0;
    return `R$ ${num.toFixed(2).replace('.', ',')}`;
}

function getBadgeEstoque(qtd) {
    const estoque = Number(qtd) || 0;
    if (estoque === 0) {
        return `<span class="badge-stock stock-empty">Esgotado (0)</span>`;
    } else if (estoque <= 5) {
        return `<span class="badge-stock stock-low">Baixo (${estoque})</span>`;
    } else {
        return `<span class="badge-stock stock-high">${estoque} un.</span>`;
    }
}

// Retorna o nome limpo da categoria (sem emojis nos produtos)
function formatarBadgeCategoria(cat) {
    if (!cat) return 'Geral';
    const limpo = cat.replace(/^[^\w\sÀ-ÿ]+/, '').trim();
    return escapeHtml(limpo || cat);
}

function renderizarTabela(produtos) {
    tabelaCorpo.innerHTML = '';

    if (!produtos || produtos.length === 0) {
        listaVazia.style.display = 'block';
        listaVazia.querySelector('h3').textContent = 'Nenhum produto encontrado';
        listaVazia.querySelector('p').textContent = 'Cadastre novos itens para exibi-los no cardápio.';
        totalBadge.textContent = '0 produto(s)';
        return;
    }

    listaVazia.style.display = 'none';
    totalBadge.textContent = `${produtos.length} produto(s)`;

    produtos.forEach(prod => {
        const tr = document.createElement('tr');
        const idProd = prod._id || '';

        tr.innerHTML = `
            <td>
                <strong>${escapeHtml(prod.nome || 'Sem nome')}</strong>
                ${prod.descricao ? `<br><small style="color: var(--text-muted);">${escapeHtml(prod.descricao)}</small>` : ''}
            </td>
            <td>
                <span class="badge-category">${formatarBadgeCategoria(prod.categoria)}</span>
            </td>
            <td class="price-text">
                ${formatarPreco(prod.preco)}
            </td>
            <td>
                ${getBadgeEstoque(prod.quantidade)}
            </td>
            <td>
                <span class="id-badge" title="${idProd}">
                    ${idProd.slice(0, 8)}...
                    <button class="btn-copy" onclick="copiarTexto('${idProd}', this)" title="Copiar ID completo">📋</button>
                </span>
            </td>
            <td>
                <div class="table-actions">
                    <button class="btn btn-edit" onclick="abrirModalEdicao('${idProd}')" title="Editar este produto">
                        Editar
                    </button>
                    <button class="btn btn-danger" onclick="excluirProduto('${idProd}', '${escapeAttr(prod.nome)}')">
                        Excluir
                    </button>
                </div>
            </td>
        `;

        tabelaCorpo.appendChild(tr);
    });
}

function filtrarTabela() {
    const termo = inputFiltro.value.toLowerCase().trim();
    if (!termo) {
        renderizarTabela(todosOsProdutos);
        return;
    }

    const filtrados = todosOsProdutos.filter(prod => {
        const nome = (prod.nome || '').toLowerCase();
        const categoria = (prod.categoria || '').toLowerCase();
        const id = (prod._id || '').toLowerCase();
        return nome.includes(termo) || categoria.includes(termo) || id.includes(termo);
    });

    renderizarTabela(filtrados);
}

// =============================================================================
// CRUD: 3. BUSCAR PRODUTO POR ID (GET /produtos/:id)
// =============================================================================

const formBuscarId = document.getElementById('form-buscar-id');
const inputBuscaId = document.getElementById('busca-id-input');
const areaResultadoId = document.getElementById('resultado-busca-id');

formBuscarId.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = inputBuscaId.value.trim();

    if (!validarObjectId(id)) {
        showToast('ID inválido! O ID do MongoDB deve ter exatamente 24 caracteres hexadecimais.', 'error');
        return;
    }

    areaResultadoId.style.display = 'block';
    areaResultadoId.innerHTML = `
        <div class="loading-state">
            <div class="spinner"></div>
            <p>Buscando produto no MongoDB...</p>
        </div>
    `;

    try {
        const response = await fetch(`/produtos/${id}`);
        if (!response.ok) {
            throw new Error(`Erro na busca: ${response.status}`);
        }

        const produto = await response.json();

        if (!produto) {
            areaResultadoId.innerHTML = `
                <div class="card result-card empty-state">
                    <div class="empty-icon-wrap">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="11" cy="11" r="8"></circle>
                            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                        </svg>
                    </div>
                    <h3>Produto não encontrado</h3>
                    <p>Nenhum item com o ID <code>${escapeHtml(id)}</code> foi localizado no banco de dados.</p>
                </div>
            `;
            return;
        }

        renderizarCardBusca(produto);

    } catch (erro) {
        console.error('Erro ao buscar produto por ID:', erro);
        showToast('Erro ao realizar consulta por ID.', 'error');
        areaResultadoId.innerHTML = `
            <div class="card result-card empty-state">
                <div class="empty-icon-wrap" style="color: var(--danger);">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"></polygon>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                </div>
                <h3>Falha na consulta</h3>
                <p>Verifique o ID informado e tente novamente.</p>
            </div>
        `;
    }
});

function renderizarCardBusca(prod) {
    const id = prod._id;
    areaResultadoId.innerHTML = `
        <div class="result-card">
            <div class="result-card-header">
                <div>
                    <span class="badge-category" style="margin-bottom: 6px;">${formatarBadgeCategoria(prod.categoria)}</span>
                    <h3>${escapeHtml(prod.nome)}</h3>
                </div>
                <div>
                    <span class="id-badge">
                        ID: ${id}
                        <button class="btn-copy" onclick="copiarTexto('${id}', this)" title="Copiar ID completo">📋</button>
                    </span>
                </div>
            </div>

            <div class="result-details-grid">
                <div class="detail-item">
                    <span class="label">Preço Unitário</span>
                    <span class="value price-text">${formatarPreco(prod.preco)}</span>
                </div>
                <div class="detail-item">
                    <span class="label">Estoque Disponível</span>
                    <span class="value">${getBadgeEstoque(prod.quantidade)}</span>
                </div>
                <div class="detail-item">
                    <span class="label">Identificador MongoDB</span>
                    <span class="value" style="font-size: 0.85rem; font-family: monospace;">${id}</span>
                </div>
            </div>

            ${prod.descricao ? `
                <div class="result-description">
                    <span class="label" style="display:block; margin-bottom: 5px; font-weight:700; font-size:0.8rem; color:var(--text-muted);">OBSERVAÇÕES:</span>
                    <p>${escapeHtml(prod.descricao)}</p>
                </div>
            ` : ''}

            <div class="result-card-actions">
                <button class="btn btn-edit" onclick="abrirModalEdicao('${id}')">
                    Editar este Produto
                </button>
                <button class="btn btn-danger" onclick="excluirProduto('${id}', '${escapeAttr(prod.nome)}', true)">
                    Excluir Produto
                </button>
            </div>
        </div>
    `;
}

// =============================================================================
// CRUD: 4. ATUALIZAR PRODUTO (PUT /produtos/:id)
// =============================================================================

const modalEditar = document.getElementById('modal-editar');
const btnFecharModal = document.getElementById('btn-fechar-modal');
const btnCancelarModal = document.getElementById('btn-cancelar-modal');
const formEditar = document.getElementById('form-editar');

btnFecharModal.addEventListener('click', fecharModalEdicao);
btnCancelarModal.addEventListener('click', fecharModalEdicao);

function fecharModalEdicao() {
    modalEditar.style.display = 'none';
    formEditar.reset();
}

// Fecha clicando fora da caixa do modal
window.addEventListener('click', (e) => {
    if (e.target === modalEditar) {
        fecharModalEdicao();
    }
});

async function abrirModalEdicao(id) {
    if (!validarObjectId(id)) {
        showToast('ID inválido para edição.', 'error');
        return;
    }

    try {
        const response = await fetch(`/produtos/${id}`);
        if (!response.ok) throw new Error('Não foi possível obter dados para edição.');
        
        const prod = await response.json();
        if (!prod) {
            showToast('Produto não encontrado.', 'error');
            return;
        }

        const categoriaLimpa = (prod.categoria || 'Outros').replace(/^[^\w\sÀ-ÿ]+/, '').trim();

        // Preenche o formulário do modal
        document.getElementById('edit-id').value = prod._id;
        document.getElementById('edit-nome').value = prod.nome || '';
        document.getElementById('edit-categoria').value = categoriaLimpa;
        document.getElementById('edit-preco').value = prod.preco !== undefined ? prod.preco : '';
        document.getElementById('edit-quantidade').value = prod.quantidade !== undefined ? prod.quantidade : '';
        document.getElementById('edit-descricao').value = prod.descricao || '';

        modalEditar.style.display = 'flex';

    } catch (erro) {
        console.error('Erro ao preparar edição:', erro);
        showToast('Erro ao abrir tela de edição.', 'error');
    }
}

formEditar.addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = document.getElementById('edit-id').value;
    const nome = document.getElementById('edit-nome').value.trim();
    const categoria = document.getElementById('edit-categoria').value.trim();
    const preco = parseFloat(document.getElementById('edit-preco').value);
    const quantidade = parseInt(document.getElementById('edit-quantidade').value, 10);
    const descricao = document.getElementById('edit-descricao').value.trim();

    if (!id || !nome || !categoria || isNaN(preco) || isNaN(quantidade)) {
        showToast('Preencha os campos obrigatórios.', 'error');
        return;
    }

    // Não enviamos o campo _id no corpo da requisição PUT para evitar restrição no MongoDB
    const dadosAtualizados = {
        nome,
        categoria,
        preco,
        quantidade,
        descricao,
        dataAtualizacao: new Date().toISOString()
    };

    try {
        const response = await fetch(`/produtos/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(dadosAtualizados)
        });

        if (!response.ok) {
            throw new Error(`Erro ao atualizar: ${response.status}`);
        }

        showToast(`Produto "${nome}" atualizado com sucesso!`, 'success');
        fecharModalEdicao();

        // Recarrega lista
        carregarProdutos();

        // Se a busca por ID estiver aberta com esse produto, atualiza também
        if (inputBuscaId.value.trim() === id && areaResultadoId.style.display !== 'none') {
            formBuscarId.dispatchEvent(new Event('submit'));
        }

    } catch (erro) {
        console.error('Erro ao atualizar produto:', erro);
        showToast('Falha ao salvar alterações do produto.', 'error');
    }
});

// =============================================================================
// CRUD: 5. DELETAR PRODUTO (DELETE /produtos/:id)
// =============================================================================

async function excluirProduto(id, nomeProduto, veioDaBusca = false) {
    if (!validarObjectId(id)) {
        showToast('ID inválido para exclusão.', 'error');
        return;
    }

    const confirmacao = window.confirm(`Deseja realmente excluir o produto "${nomeProduto || id}" da cantina? Esta ação não pode ser desfeita.`);
    if (!confirmacao) return;

    try {
        const response = await fetch(`/produtos/${id}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error(`Erro ao deletar: ${response.status}`);
        }

        showToast(`Produto removido com sucesso!`, 'success');

        // Atualiza a tabela geral
        carregarProdutos();

        // Se o produto foi excluído da tela de busca por ID, limpa a exibição
        if (veioDaBusca || inputBuscaId.value.trim() === id) {
            areaResultadoId.innerHTML = `
                <div class="card result-card empty-state">
                    <div class="empty-icon-wrap">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                    </div>
                    <h3>Produto excluído com sucesso</h3>
                    <p>O registro correspondente foi removido do banco de dados.</p>
                </div>
            `;
        }

    } catch (erro) {
        console.error('Erro ao excluir produto:', erro);
        showToast('Não foi possível excluir o produto.', 'error');
    }
}

// =============================================================================
// FUNÇÕES AUXILIARES / UTILITÁRIAS
// =============================================================================

// Valida se a string é um ObjectId válido do MongoDB (24 caracteres hex)
function validarObjectId(id) {
    return typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id);
}

// Copiar texto para a área de transferência com feedback visual no botão
function copiarTexto(texto, btnEl) {
    if (!texto) return;

    function darFeedback() {
        showToast('ID copiado para a área de transferência!', 'info');
        if (btnEl) {
            const original = btnEl.innerText;
            btnEl.innerText = '✅';
            setTimeout(() => {
                btnEl.innerText = original;
            }, 1200);
        }
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(texto)
            .then(darFeedback)
            .catch(() => fallbackCopiar(texto, darFeedback));
    } else {
        fallbackCopiar(texto, darFeedback);
    }
}

function fallbackCopiar(texto, callback) {
    const temp = document.createElement('textarea');
    temp.value = texto;
    temp.style.position = 'fixed';
    temp.style.opacity = '0';
    document.body.appendChild(temp);
    temp.select();
    try {
        document.execCommand('copy');
        if (callback) callback();
    } catch (err) {
        showToast('Erro ao copiar ID.', 'error');
    }
    document.body.removeChild(temp);
}

// Evita injeção de HTML no DOM
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function escapeAttr(str) {
    if (!str) return '';
    return String(str).replace(/"/g, '&quot;').replace(/'/g, '\\\'');
}

// =============================================================================
// INICIALIZAÇÃO DA PÁGINA
// =============================================================================
document.addEventListener('DOMContentLoaded', () => {
    // Restaura a aba que o usuário estava antes de recarregar (F5)
    restaurarAbaAtiva();
    console.log('Cantina Sr. Leão - Sistema carregado com persistência de tela ativa!');
});
