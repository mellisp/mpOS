/* ================================================================
 * Chat — AI Help Assistant (IIFE)
 * Keyword search through HELP_TOPICS + optional LLM via Cloudflare Workers AI
 * ================================================================ */
;(() => {
  'use strict';

  const WORKER_URL = 'https://mpos-chat.matthewpritchard.workers.dev';
  const MAX_HISTORY = 10;

  /* ── State ── */
  let messages = [];       // { role: 'user'|'assistant'|'system', content: string }
  let aiAvailable = null;  // null = untested, true/false after first check
  let helpLoaded = false;
  let sending = false;

  /* ── DOM refs (resolved once on first open) ── */
  let chatMessagesEl, chatInputEl, chatStatusEl, chatSendBtn;

  const resolveDOM = () => {
    chatMessagesEl = document.getElementById('chatMessages');
    chatInputEl    = document.getElementById('chatInput');
    chatStatusEl   = document.getElementById('chatStatus');
    chatSendBtn    = document.getElementById('chatSendBtn');
  };

  /* ── Help topic search ── */

  const tokenize = (text) =>
    text.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(Boolean);

  const flattenBody = (body) =>
    body.map((block) => {
      if (block.p) return block.p;
      if (block.h) return block.h;
      if (block.ul) return block.ul.join('. ');
      return '';
    }).filter(Boolean).join(' ');

  const searchHelpTopics = (query) => {
    const topics = window.HELP_TOPICS;
    if (!topics) return [];

    const lang = window.getLang?.() || 'en';
    const isPt = lang === 'pt';
    const tokens = tokenize(query);
    if (!tokens.length) return [];

    const scored = [];
    for (const [id, topic] of Object.entries(topics)) {
      const keywords = isPt && topic.keywords_pt ? topic.keywords_pt : topic.keywords;
      const title = isPt && topic.title_pt ? topic.title_pt : topic.title;
      const body = isPt && topic.body_pt ? topic.body_pt : topic.body;

      // Score: keyword matches + title matches
      let score = 0;
      const kwLower = keywords.map((k) => k.toLowerCase());
      const titleLower = title.toLowerCase();

      for (const tok of tokens) {
        for (const kw of kwLower) {
          if (kw.includes(tok)) score += 2;
        }
        if (titleLower.includes(tok)) score += 3;
      }

      if (score > 0) {
        scored.push({ id, title, body, score, bodyText: flattenBody(body) });
      }
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 5);
  };

  /* ── Message rendering ── */

  const scrollToBottom = () => {
    if (chatMessagesEl) chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
  };

  const renderMessage = (role, content, extraClass) => {
    if (!chatMessagesEl) return;
    const div = document.createElement('div');
    div.className = `chat-msg chat-msg-${role}${extraClass ? ' ' + extraClass : ''}`;
    div.textContent = content;
    chatMessagesEl.appendChild(div);
    scrollToBottom();
  };

  const renderTopicCards = (topics) => {
    if (!chatMessagesEl) return;
    const wrapper = document.createElement('div');
    wrapper.className = 'chat-msg chat-msg-assistant';

    if (!topics.length) {
      wrapper.textContent = window.t?.('chat.noResults') || 'I couldn\'t find anything about that. Try rephrasing your question.';
      chatMessagesEl.appendChild(wrapper);
      scrollToBottom();
      return;
    }

    for (const topic of topics) {
      const card = document.createElement('div');
      card.className = 'chat-topic-card';

      const h = document.createElement('div');
      h.className = 'chat-topic-title';
      h.textContent = topic.title;
      h.addEventListener('click', () => {
        if (window.openHelp) window.openHelp();
      });
      card.appendChild(h);

      // Show first paragraph or two of body
      let shown = 0;
      for (const block of topic.body) {
        if (shown >= 2) break;
        if (block.p) {
          const p = document.createElement('p');
          p.className = 'chat-topic-body';
          p.textContent = block.p;
          card.appendChild(p);
          shown++;
        } else if (block.ul) {
          const ul = document.createElement('ul');
          ul.className = 'chat-topic-list';
          for (const item of block.ul.slice(0, 3)) {
            const li = document.createElement('li');
            li.textContent = item;
            ul.appendChild(li);
          }
          card.appendChild(ul);
          shown++;
        }
      }

      wrapper.appendChild(card);
    }

    chatMessagesEl.appendChild(wrapper);
    scrollToBottom();
  };

  /* ── AI check + query ── */

  const checkAI = async () => {
    if (aiAvailable !== null) return aiAvailable;
    try {
      // OPTIONS preflight is enough to confirm the worker is reachable
      const resp = await fetch(WORKER_URL + '/chat', {
        method: 'OPTIONS',
        signal: AbortSignal.timeout(5000)
      });
      aiAvailable = resp.ok || resp.status === 204;
    } catch {
      aiAvailable = false;
    }
    updateStatus();
    return aiAvailable;
  };

  const queryAI = async (userText, topicContext) => {
    // Build context from matched help topics
    let contextBlock = '';
    if (topicContext.length) {
      contextBlock = '\n\nRelevant help topics:\n' +
        topicContext.map((t) => `## ${t.title}\n${t.bodyText}`).join('\n\n');
    }

    // Build message history for multi-turn
    const aiMessages = [];
    // First user message gets the context injected
    for (const msg of messages) {
      aiMessages.push({ role: msg.role, content: msg.content });
    }
    // Inject context into the last user message
    if (aiMessages.length && contextBlock) {
      const last = aiMessages[aiMessages.length - 1];
      if (last.role === 'user') {
        last.content = last.content + contextBlock;
      }
    }

    const resp = await fetch(WORKER_URL + '/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: aiMessages }),
      signal: AbortSignal.timeout(15000)
    });

    if (!resp.ok) throw new Error('AI request failed');
    const data = await resp.json();
    return data.response;
  };

  /* ── Status bar ── */

  const updateStatus = () => {
    if (!chatStatusEl) return;
    if (sending) {
      chatStatusEl.textContent = window.t?.('chat.thinking') || 'Thinking...';
    } else if (aiAvailable) {
      chatStatusEl.textContent = window.t?.('chat.aiStatus.ready') || 'AI mode active';
    } else if (aiAvailable === false) {
      chatStatusEl.textContent = window.t?.('chat.aiStatus.unavailable') || 'Keyword search mode';
    } else {
      chatStatusEl.textContent = window.t?.('chat.ready') || 'Ready';
    }
  };

  /* ── Send message ── */

  const sendMessage = async () => {
    if (!chatInputEl || sending) return;
    const text = chatInputEl.value.trim();
    if (!text) return;

    chatInputEl.value = '';
    chatInputEl.style.height = 'auto';
    messages.push({ role: 'user', content: text });
    renderMessage('user', text);

    // Search help topics
    const topics = searchHelpTopics(text);

    sending = true;
    updateStatus();
    if (chatSendBtn) chatSendBtn.disabled = true;

    try {
      if (aiAvailable) {
        const answer = await queryAI(text, topics);
        messages.push({ role: 'assistant', content: answer });
        renderMessage('assistant', answer);
      } else {
        // Keyword search fallback
        renderTopicCards(topics);
      }
    } catch {
      // On AI error, fall back to keyword search
      if (topics.length) {
        renderTopicCards(topics);
      } else {
        renderMessage('assistant', window.t?.('chat.noResults') || 'I couldn\'t find anything about that. Try rephrasing your question.');
      }
    } finally {
      sending = false;
      updateStatus();
      if (chatSendBtn) chatSendBtn.disabled = false;
    }

    // Trim history
    if (messages.length > MAX_HISTORY) {
      messages = messages.slice(-MAX_HISTORY);
    }
  };

  /* ── Auto-resize textarea ── */

  const autoResize = () => {
    if (!chatInputEl) return;
    chatInputEl.style.height = 'auto';
    chatInputEl.style.height = Math.min(chatInputEl.scrollHeight, 80) + 'px';
  };

  /* ── Clear history ── */

  const clearChat = () => {
    messages = [];
    if (chatMessagesEl) chatMessagesEl.innerHTML = '';
    showWelcome();
  };

  /* ── Welcome message ── */

  const showWelcome = () => {
    renderMessage('system', window.t?.('chat.welcome') || 'Hi! Ask me anything about mpOS.');
  };

  /* ── Open / Close ── */

  const openChat = () => {
    resolveDOM();

    // Lazy-load help data
    if (!helpLoaded && !window.HELP_TOPICS) {
      window.loadDataScript?.('js/help-data.js');
      helpLoaded = true;
    }

    window.openWindow('chat');

    // First open: show welcome + check AI
    if (!chatMessagesEl?.children.length) {
      showWelcome();
      checkAI();
    }

    // Set up input handlers (idempotent)
    if (chatInputEl && !chatInputEl._chatBound) {
      chatInputEl._chatBound = true;
      chatInputEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          sendMessage();
        }
      });
      chatInputEl.addEventListener('input', autoResize);
    }
  };

  const closeChat = () => {
    window.mpTaskbar?.closeWindow('chat');
  };

  /* ── Language refresh ── */

  const chatRefreshOnLangChange = () => {
    updateStatus();
    // Update placeholder
    if (chatInputEl) {
      chatInputEl.placeholder = window.t?.('chat.placeholder') || 'Ask about mpOS...';
    }
  };

  /* ── Registration ── */

  window.openChat = openChat;
  window.closeChat = closeChat;
  window.sendChatMessage = sendMessage;
  window.clearChatHistory = clearChat;
  window.chatRefreshOnLangChange = chatRefreshOnLangChange;

  mpRegisterActions({ openChat });
  mpRegisterWindows({ chat: 'Chat' });
  mpRegisterCloseHandlers({ chat: closeChat });
})();
