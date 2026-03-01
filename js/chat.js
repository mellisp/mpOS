/* ================================================================
 * Chat — AI Help Assistant (IIFE)
 * Keyword search through HELP_TOPICS + streaming LLM via Cloudflare Workers AI
 * ================================================================ */
;(() => {
  'use strict';

  const WORKER_URL = 'https://mpos-chat.matthewpritchard.workers.dev';
  const MAX_HISTORY = 10;

  /* ── State ── */
  let messages = [];       // { role: 'user'|'assistant', content: string }
  let aiAvailable = true;  // optimistic default; set false on first failure
  let helpLoaded = false;
  let sending = false;
  let visitorName = 'Guest';
  let ipFetched = false;

  /* ── DOM refs (resolved once on first open) ── */
  let chatMessagesEl, chatInputEl, chatStatusEl, chatSendBtn;

  const resolveDOM = () => {
    chatMessagesEl = document.getElementById('chatMessages');
    chatInputEl    = document.getElementById('chatInput');
    chatStatusEl   = document.getElementById('chatStatus');
    chatSendBtn    = document.getElementById('chatSendBtn');
  };

  /* ── IP fetch for screen name ── */

  const fetchVisitorIP = async () => {
    if (ipFetched) return;
    ipFetched = true;
    try {
      const resp = await window.mpFetch(WORKER_URL + '/ip', { timeout: 5000 });
      if (resp.ok) {
        const data = await resp.json();
        if (data.ip) visitorName = data.ip;
      }
    } catch { /* keep Guest */ }
  };

  /* ── Help topic search (keyword fallback) ── */

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

  const BOT_NAME = 'mpOSbot';

  const timeStamp = () =>
    new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  const scrollToBottom = () => {
    if (chatMessagesEl) chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
  };

  const renderMessage = (role, content) => {
    if (!chatMessagesEl) return;

    if (role === 'system') {
      const div = document.createElement('div');
      div.className = 'chat-msg chat-msg-system';
      div.textContent = content;
      chatMessagesEl.appendChild(div);
      scrollToBottom();
      return;
    }

    const div = document.createElement('div');
    div.className = 'chat-msg';

    const header = document.createElement('div');
    header.className = 'chat-msg-header';
    const nameSpan = document.createElement('span');
    nameSpan.className = role === 'assistant' ? 'chat-screen-name-bot' : 'chat-screen-name-user';
    nameSpan.textContent = role === 'assistant' ? BOT_NAME : visitorName;
    const timeSpan = document.createElement('span');
    timeSpan.className = 'chat-timestamp';
    timeSpan.textContent = ` (${timeStamp()}):`;
    header.appendChild(nameSpan);
    header.appendChild(timeSpan);
    div.appendChild(header);

    const body = document.createElement('div');
    body.className = 'chat-msg-body';
    body.textContent = content;
    div.appendChild(body);

    chatMessagesEl.appendChild(div);
    scrollToBottom();
    return body;  // return body element for streaming updates
  };

  /** Create an empty assistant message shell for progressive rendering */
  const createAssistantMessage = () => {
    if (!chatMessagesEl) return null;

    const div = document.createElement('div');
    div.className = 'chat-msg';

    const header = document.createElement('div');
    header.className = 'chat-msg-header';
    const nameSpan = document.createElement('span');
    nameSpan.className = 'chat-screen-name-bot';
    nameSpan.textContent = BOT_NAME;
    const timeSpan = document.createElement('span');
    timeSpan.className = 'chat-timestamp';
    timeSpan.textContent = ` (${timeStamp()}):`;
    header.appendChild(nameSpan);
    header.appendChild(timeSpan);
    div.appendChild(header);

    const body = document.createElement('div');
    body.className = 'chat-msg-body';
    div.appendChild(body);

    chatMessagesEl.appendChild(div);
    scrollToBottom();
    return body;  // the element to update with streaming tokens
  };

  const renderTopicCards = (topics) => {
    if (!chatMessagesEl) return;
    const wrapper = document.createElement('div');
    wrapper.className = 'chat-msg';

    const header = document.createElement('div');
    header.className = 'chat-msg-header';
    const nameSpan = document.createElement('span');
    nameSpan.className = 'chat-screen-name-bot';
    nameSpan.textContent = BOT_NAME;
    const timeSpan = document.createElement('span');
    timeSpan.className = 'chat-timestamp';
    timeSpan.textContent = ` (${timeStamp()}):`;
    header.appendChild(nameSpan);
    header.appendChild(timeSpan);
    wrapper.appendChild(header);

    if (!topics.length) {
      const body = document.createElement('div');
      body.className = 'chat-msg-body';
      body.textContent = window.t?.('chat.noResults') || 'I couldn\'t find anything about that. Try rephrasing your question.';
      wrapper.appendChild(body);
      chatMessagesEl.appendChild(wrapper);
      scrollToBottom();
      return;
    }

    const body = document.createElement('div');
    body.className = 'chat-msg-body';

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

      body.appendChild(card);
    }

    wrapper.appendChild(body);
    chatMessagesEl.appendChild(wrapper);
    scrollToBottom();
  };

  /* ── Streaming AI query ── */

  const queryAI = async (userText) => {
    const resp = await window.mpFetch(WORKER_URL + '/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'text/event-stream' },
      body: JSON.stringify({ messages: messages.slice(-MAX_HISTORY) }),
      timeout: 30000
    });

    if (!resp.ok) throw new Error('AI request failed');

    // Check if streaming response
    const contentType = resp.headers.get('content-type') || '';
    if (!contentType.includes('text/event-stream')) {
      // Non-streaming fallback (in case Worker hasn't been updated yet)
      const data = await resp.json();
      return data.response;
    }

    // Stream SSE tokens progressively
    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let fullResponse = '';
    let buffer = '';
    const msgEl = createAssistantMessage();

    // Switch status to streaming
    if (chatStatusEl) {
      chatStatusEl.textContent = window.t?.('chat.aiStatus.streaming') || 'Receiving...';
    }

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const payload = line.slice(6);
        if (payload === '[DONE]') break;
        try {
          const parsed = JSON.parse(payload);
          const token = parsed.response;
          if (token) {
            fullResponse += token;
            if (msgEl) msgEl.textContent = fullResponse;
            scrollToBottom();
          }
        } catch { /* skip malformed chunks */ }
      }
    }

    return { text: fullResponse, streamed: !!msgEl };
  };

  /* ── Status bar ── */

  const updateStatus = () => {
    if (!chatStatusEl) return;
    if (sending) {
      chatStatusEl.textContent = window.t?.('chat.thinking') || 'Thinking...';
    } else if (aiAvailable) {
      chatStatusEl.textContent = window.t?.('chat.aiStatus.ready') || 'AI mode active';
    } else {
      chatStatusEl.textContent = window.t?.('chat.aiStatus.unavailable') || 'Keyword search mode';
    }
  };

  /* ── Send message ── */

  const sendMessage = async () => {
    if (!chatInputEl || sending) return;
    const text = chatInputEl.value.trim();
    if (!text) return;

    chatInputEl.value = '';
    messages.push({ role: 'user', content: text });
    renderMessage('user', text);

    const topics = searchHelpTopics(text);

    sending = true;
    updateStatus();
    if (chatSendBtn) chatSendBtn.disabled = true;

    try {
      if (aiAvailable) {
        const result = await queryAI(text);
        if (typeof result === 'string') {
          // Non-streaming response
          messages.push({ role: 'assistant', content: result });
          renderMessage('assistant', result);
        } else {
          // Streamed — message already rendered progressively
          messages.push({ role: 'assistant', content: result.text });
        }
      } else {
        renderTopicCards(topics);
      }
    } catch {
      // AI failed — mark unavailable and fall back to keyword search
      aiAvailable = false;
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

    if (messages.length > MAX_HISTORY) {
      messages = messages.slice(-MAX_HISTORY);
    }
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

    if (!helpLoaded && !window.HELP_TOPICS) {
      window.loadDataScript?.('js/help-data.js');
      helpLoaded = true;
    }

    window.openWindow('chat');

    if (!chatMessagesEl?.children.length) {
      showWelcome();
      fetchVisitorIP();
    }

    if (chatInputEl && !chatInputEl._chatBound) {
      chatInputEl._chatBound = true;
      chatInputEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          sendMessage();
        }
      });
    }
  };

  const closeChat = () => {
    window.mpTaskbar?.closeWindow('chat');
  };

  /* ── Language refresh ── */

  const chatRefreshOnLangChange = () => {
    updateStatus();
    if (chatInputEl) {
      chatInputEl.placeholder = window.t?.('chat.placeholder') || 'Ask about mpOS...';
    }
  };

  /* ── Delegated listener for send button ── */
  document.getElementById('chat')?.addEventListener('click', (e) => {
    const act = e.target.closest('[data-action]');
    if (act && act.dataset.action === 'sendChatMessage') sendMessage();
  });

  /* ── Registration ── */

  window.openChat = openChat;
  window.closeChat = closeChat;
  window.clearChatHistory = clearChat;
  window.chatRefreshOnLangChange = chatRefreshOnLangChange;

  mpRegisterActions({ openChat });
  mpRegisterWindows({ chat: 'Chat - mpOSbot' });
  mpRegisterCloseHandlers({ chat: closeChat });
})();
