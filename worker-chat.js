/* Chat — Cloudflare Worker with Workers AI
   Deploy this as a separate Worker at dashboard.cloudflare.com.
   No KV or other bindings needed — just enable Workers AI in the Worker settings.

   Usage:
     POST /chat  { "messages": [{ "role": "user", "content": "..." }] }
     Returns:     { "response": "..." }

   The Worker uses @cf/meta/llama-3.2-1b-instruct for inference.
   Free tier: 10,000 neurons/day. */

const ALLOWED_ORIGINS = new Set([
  'https://www.matthewpritchard.com',
  'https://matthewpritchard.com',
  'http://localhost:8000',
  'http://127.0.0.1:8000'
]);

const SYSTEM_PROMPT = `You are mpOS Help, a concise assistant for mpOS — a retro desktop OS built in the browser at matthewpritchard.com. Answer questions about the site's apps and features using ONLY the help context provided below. Keep answers short (2-4 sentences). If the context doesn't cover the question, say so briefly. Do not make up features.`;

function corsHeaders(origin) {
  if (ALLOWED_ORIGINS.has(origin)) {
    return {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400'
    };
  }
  return {};
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const headers = corsHeaders(origin);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers });
    }

    const url = new URL(request.url);

    // GET /ip — return visitor's public IP
    if (url.pathname === '/ip' && request.method === 'GET') {
      const ip = request.headers.get('cf-connecting-ip') || '';
      return new Response(JSON.stringify({ ip }), {
        headers: { ...headers, 'Content-Type': 'application/json' }
      });
    }

    if (url.pathname !== '/chat' || request.method !== 'POST') {
      return new Response('Not found', { status: 404, headers });
    }

    if (!ALLOWED_ORIGINS.has(origin)) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403, headers: { ...headers, 'Content-Type': 'application/json' }
      });
    }

    try {
      const { messages } = await request.json();
      if (!Array.isArray(messages) || messages.length === 0) {
        return new Response(JSON.stringify({ error: 'messages array required' }), {
          status: 400, headers: { ...headers, 'Content-Type': 'application/json' }
        });
      }

      // Prepend system prompt
      const aiMessages = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...messages.slice(-10) // Keep last 10 messages to stay within context
      ];

      const result = await env.AI.run('@cf/meta/llama-3.2-1b-instruct', {
        messages: aiMessages,
        max_tokens: 300
      });

      return new Response(JSON.stringify({ response: result.response }), {
        headers: { ...headers, 'Content-Type': 'application/json' }
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: 'AI inference failed' }), {
        status: 500, headers: { ...headers, 'Content-Type': 'application/json' }
      });
    }
  }
};
