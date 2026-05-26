# resumo· — Resumidor de Artigos com IA

Leia menos, entenda mais. Projeto de portfólio com integração real à API do Claude.

## Demo

Abra o `index.html` no navegador ou hospede no GitHub Pages.

> **Atenção**: Para usar, você precisa de uma chave de API da Anthropic.  
> Obtenha em [console.anthropic.com](https://console.anthropic.com) → API Keys.

## Funcionalidades

- Cole qualquer texto ou artigo e receba um resumo inteligente
- 4 estilos de resumo: **tópicos**, **parágrafo**, **TL;DR**, **executivo**
- 3 tamanhos: curto, médio, detalhado
- Resumo em **português, inglês ou espanhol**
- Histórico de resumos salvo no localStorage (até 20 itens)
- Feedback de qualidade por resumo
- Chave de API salva com segurança no navegador

## Tecnologias

| Tecnologia | Uso |
|---|---|
| Claude API (Anthropic) | Geração inteligente dos resumos |
| Vanilla JS (ES2022) | Toda a lógica sem frameworks |
| localStorage | Histórico e chave de API |
| CSS Custom Properties | Tema dark editorial |
| Google Fonts | Playfair Display + Instrument Sans |

## Como rodar

```bash
git clone https://github.com/seu-usuario/resumidor
cd resumidor
open index.html
```

Na primeira vez, clique em **API key** no topo e insira sua chave `sk-ant-...`

## Publicar no GitHub Pages

1. Crie um repositório no GitHub
2. Faça upload dos arquivos: `index.html`, `style.css`, `script.js`
3. Vá em **Settings → Pages → Source: main branch**
4. Acesse `https://seu-usuario.github.io/resumidor`

> **Nota de segurança**: Em produção real, a chave de API deveria ficar em um backend (Node.js/serverless). Para portfólio e uso pessoal, guardar no localStorage é aceitável — jamais exponha a chave em código público.

## Como funciona

```
Usuário cola texto
       ↓
buildPrompt() monta instrução com estilo + tamanho + idioma
       ↓
fetch() → POST /v1/messages (Claude API)
       ↓
renderMarkdown() formata a resposta
       ↓
saveToHistory() persiste no localStorage
```

## Estrutura

```
resumidor/
├── index.html   # Estrutura, modal de API key, painel de histórico
├── style.css    # Tema editorial dark, animações, responsivo
└── script.js    # Integração Claude API, histórico, renderização
```

## Próximas melhorias

- [ ] Backend Node.js/Express para proteger a API key
- [ ] Suporte a upload de PDF
- [ ] Exportar resumo como .md ou .txt
- [ ] Compartilhar resumo via link
- [ ] Comparar o original com o resumo lado a lado

---

Feito com Claude API · zero dependências de UI · para o portfólio
