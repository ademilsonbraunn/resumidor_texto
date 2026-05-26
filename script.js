'use strict';

// ─── State ─────────────────────────────────────────────────────
let currentMode = 'text';
let history = JSON.parse(localStorage.getItem('resumo_history') || '[]');

// ─── DOM refs ──────────────────────────────────────────────────
const textInput     = document.getElementById('textInput');
const urlInput      = document.getElementById('urlInput');
const styleSelect   = document.getElementById('styleSelect');
const lengthSelect  = document.getElementById('lengthSelect');
const langSelect    = document.getElementById('langSelect');
const summarizeBtn  = document.getElementById('summarizeBtn');
const btnText       = document.getElementById('btnText');
const btnIcon       = document.getElementById('btnIcon');
const spinner       = document.getElementById('spinner');
const resultCard    = document.getElementById('resultCard');
const resultBody    = document.getElementById('resultBody');
const resultBadge   = document.getElementById('resultBadge');
const resultTime    = document.getElementById('resultTime');
const resultWords   = document.getElementById('resultWords');
const errorCard     = document.getElementById('errorCard');
const errorMsg      = document.getElementById('errorMsg');
const charCount     = document.getElementById('charCount');
const historyCount  = document.getElementById('historyCount');
const historyList   = document.getElementById('historyList');
const historyEmpty  = document.getElementById('historyEmpty');
const historyPanel  = document.getElementById('historyPanel');
const keyModal      = document.getElementById('keyModal');
const apiKeyInput   = document.getElementById('apiKeyInput');

// ─── Init ──────────────────────────────────────────────────────
renderHistory();
updateHistoryCount();

textInput.addEventListener('input', () => {
  const n = textInput.value.length;
  charCount.textContent = n.toLocaleString('pt-BR') + ' caractere' + (n !== 1 ? 's' : '');
});

document.getElementById('historyToggle').addEventListener('click', () => {
  historyPanel.classList.toggle('open');
});

document.getElementById('keyBtn').addEventListener('click', openKeyModal);

// Close history on outside click
document.addEventListener('click', e => {
  if (!historyPanel.contains(e.target) && !document.getElementById('historyToggle').contains(e.target)) {
    historyPanel.classList.remove('open');
  }
});

// ─── Mode switch ───────────────────────────────────────────────
function switchMode(mode) {
  currentMode = mode;
  document.querySelectorAll('.tab').forEach(t => {
    t.classList.toggle('active', t.dataset.mode === mode);
    t.setAttribute('aria-selected', t.dataset.mode === mode);
  });
  document.getElementById('textMode').style.display = mode === 'text' ? 'block' : 'none';
  document.getElementById('urlMode').style.display  = mode === 'url'  ? 'block' : 'none';
}

// ─── API Key ───────────────────────────────────────────────────
function openKeyModal() {
  const saved = localStorage.getItem('anthropic_key') || '';
  apiKeyInput.value = saved ? saved.slice(0, 8) + '•'.repeat(20) : '';
  keyModal.classList.add('open');
  if (!saved) setTimeout(() => apiKeyInput.focus(), 100);
}

function closeKeyModal() {
  keyModal.classList.remove('open');
}

function saveKey() {
  const val = apiKeyInput.value.trim();
  if (!val || val.includes('•')) { closeKeyModal(); return; }
  if (!val.startsWith('sk-ant-')) {
    showToast('chave inválida — deve começar com sk-ant-');
    return;
  }
  localStorage.setItem('anthropic_key', val);
  closeKeyModal();
  showToast('chave salva!');
}

keyModal.addEventListener('click', e => { if (e.target === keyModal) closeKeyModal(); });

// ─── Build prompt ──────────────────────────────────────────────
function buildPrompt(content, style, length, lang) {
  const langMap = { pt: 'português', en: 'inglês', es: 'espanhol' };
  const lengthMap = {
    short:  'muito conciso (máximo 3 pontos ou 2 parágrafos curtos)',
    medium: 'moderado (4–6 pontos ou 3 parágrafos)',
    long:   'detalhado (7–10 pontos ou 4–5 parágrafos com contexto)'
  };
  const styleInstructions = {
    bullets:   'em tópicos com bullet points (use • para cada ponto principal)',
    paragraph: 'em parágrafos corridos, fluidos e bem escritos',
    tldr:      'no formato TL;DR: uma frase de impacto seguida de 2–3 pontos essenciais',
    executive: 'no formato executivo: contexto em 1 frase, principais insights, impacto/conclusão'
  };

  return `Você é um especialista em resumir conteúdo de forma clara e inteligente.

Resuma o texto abaixo ${styleInstructions[style]}.
Tamanho: ${lengthMap[length]}.
Idioma do resumo: ${langMap[lang]}.

Regras:
- Preserve os fatos e números importantes
- Não adicione opiniões suas
- Seja direto e objetivo
- Não escreva "Aqui está o resumo:" ou frases introdutórias
- Comece diretamente com o conteúdo resumido

TEXTO:
${content}`;
}

// ─── Summarize ─────────────────────────────────────────────────
async function summarize() {
  const apiKey = localStorage.getItem('anthropic_key');
  if (!apiKey) {
    openKeyModal();
    showToast('configure sua API key primeiro');
    return;
  }

  const content = currentMode === 'text'
    ? textInput.value.trim()
    : urlInput.value.trim();

  if (!content) {
    showError(currentMode === 'text'
      ? 'Cole um texto antes de resumir.'
      : 'Insira uma URL válida.');
    return;
  }

  if (currentMode === 'text' && content.length < 80) {
    showError('O texto é muito curto para resumir. Tente com pelo menos 80 caracteres.');
    return;
  }

  const style  = styleSelect.value;
  const length = lengthSelect.value;
  const lang   = langSelect.value;

  setLoading(true);
  hideError();
  resultCard.style.display = 'none';

  const t0 = Date.now();

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: buildPrompt(content, style, length, lang)
        }]
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      const msg = err?.error?.message || `Erro ${response.status}`;
      if (response.status === 401) throw new Error('API key inválida ou expirada. Verifique em console.anthropic.com');
      if (response.status === 429) throw new Error('Limite de requisições atingido. Aguarde um momento.');
      throw new Error(msg);
    }

    const data = await response.json();
    const summary = data.content?.[0]?.text || '';
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

    showResult(summary, style, elapsed);
    saveToHistory(content, summary, style, lang);

  } catch (err) {
    showError(err.message || 'Erro ao conectar com a API. Tente novamente.');
  } finally {
    setLoading(false);
  }
}

// ─── Result rendering ──────────────────────────────────────────
function showResult(text, style, elapsed) {
  const styleLabels = { bullets: 'tópicos', paragraph: 'parágrafo', tldr: 'TL;DR', executive: 'executivo' };
  resultBadge.textContent = styleLabels[style] || style;
  resultTime.textContent  = elapsed + 's';

  // Render markdown-lite
  resultBody.innerHTML = renderMarkdown(text);

  // Word count
  const words = text.trim().split(/\s+/).length;
  resultWords.textContent = words + ' palavras';

  resultCard.style.display = 'block';
  resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function renderMarkdown(text) {
  // bullets
  if (text.includes('\n•') || text.match(/^\s*•/m) || text.match(/^\s*-\s/m)) {
    const lines = text.split('\n');
    let html = '';
    let inList = false;
    for (const line of lines) {
      const clean = line.replace(/^[\s•\-*]+/, '').trim();
      if (!clean) { if (inList) { html += '</ul>'; inList = false; } continue; }
      if (line.match(/^\s*[•\-*]\s/)) {
        if (!inList) { html += '<ul>'; inList = true; }
        html += `<li>${formatInline(clean)}</li>`;
      } else {
        if (inList) { html += '</ul>'; inList = false; }
        html += `<p>${formatInline(clean)}</p>`;
      }
    }
    if (inList) html += '</ul>';
    return html;
  }
  // paragraphs
  return text.split(/\n\n+/).filter(Boolean).map(p => `<p>${formatInline(p.trim())}</p>`).join('');
}

function formatInline(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>');
}

// ─── History ───────────────────────────────────────────────────
function saveToHistory(input, summary, style, lang) {
  const item = {
    id: Date.now(),
    preview: summary.replace(/<[^>]+>/g, '').slice(0, 120),
    summary,
    style,
    lang,
    date: new Date().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
  };
  history.unshift(item);
  if (history.length > 20) history = history.slice(0, 20);
  localStorage.setItem('resumo_history', JSON.stringify(history));
  renderHistory();
  updateHistoryCount();
}

function renderHistory() {
  historyList.innerHTML = '';
  if (!history.length) {
    historyEmpty.style.display = 'block';
    return;
  }
  historyEmpty.style.display = 'none';
  history.forEach(item => {
    const el = document.createElement('div');
    el.className = 'history-item';
    el.innerHTML = `
      <div class="history-item-preview">${item.preview}…</div>
      <div class="history-item-meta">${item.date} · ${item.style}</div>`;
    el.addEventListener('click', () => {
      resultBody.innerHTML = renderMarkdown(item.summary);
      resultBadge.textContent = item.style;
      resultTime.textContent = '';
      const words = item.summary.trim().split(/\s+/).length;
      resultWords.textContent = words + ' palavras';
      resultCard.style.display = 'block';
      historyPanel.classList.remove('open');
      resultCard.scrollIntoView({ behavior: 'smooth' });
    });
    historyList.appendChild(el);
  });
}

function clearHistory() {
  if (!confirm('Limpar todo o histórico?')) return;
  history = [];
  localStorage.removeItem('resumo_history');
  renderHistory();
  updateHistoryCount();
}

function updateHistoryCount() {
  if (history.length) {
    historyCount.textContent = history.length;
    historyCount.style.display = 'inline';
  } else {
    historyCount.style.display = 'none';
  }
}

// ─── UI helpers ────────────────────────────────────────────────
function setLoading(on) {
  summarizeBtn.disabled = on;
  btnText.textContent = on ? 'resumindo...' : 'resumir';
  btnIcon.style.display = on ? 'none' : 'inline';
  spinner.style.display = on ? 'inline-block' : 'none';
}

function showError(msg) {
  errorMsg.textContent = msg;
  errorCard.style.display = 'flex';
}

function hideError() {
  errorCard.style.display = 'none';
}

function newSummary() {
  resultCard.style.display = 'none';
  hideError();
  if (currentMode === 'text') {
    textInput.value = '';
    charCount.textContent = '0 caracteres';
    textInput.focus();
  } else {
    urlInput.value = '';
    urlInput.focus();
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function copyResult() {
  const text = resultBody.innerText || resultBody.textContent;
  navigator.clipboard.writeText(text)
    .then(() => showToast('resumo copiado!'))
    .catch(() => showToast('erro ao copiar'));
}

function feedback(type) {
  showToast(type === 'like' ? 'obrigado pelo feedback!' : 'anotado, vamos melhorar!');
}

let toastTimer;
function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
}
