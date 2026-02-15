/* Visitor Map — Cloudflare Worker
   Paste this into the Worker editor at dashboard.cloudflare.com
   Bind a KV namespace named VISITORS to this Worker. */

const ALLOWED_ORIGIN = 'https://www.matthewpritchard.com';
const BLOCKED_IPS = new Set(['148.69.200.122']);

function corsHeaders(origin) {
  if (origin === ALLOWED_ORIGIN || origin === 'https://matthewpritchard.com') {
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
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '';
    const headers = corsHeaders(origin);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers });
    }

    // Only handle /visit
    if (url.pathname !== '/visit') {
      return new Response('Not found', { status: 404, headers });
    }

    // Check KV binding exists
    if (!env.visitor_map) {
      return new Response(JSON.stringify({ error: 'KV binding visitor_map not found' }), {
        status: 500, headers: { ...headers, 'Content-Type': 'application/json' }
      });
    }

    try {
      // POST: record visit + return counts (skip blocked IPs, rate-limit per IP)
      if (request.method === 'POST') {
        const ip = request.headers.get('cf-connecting-ip') || '';
        if (!BLOCKED_IPS.has(ip)) {
          const rateKey = 'rate:' + ip;
          const limited = await env.visitor_map.get(rateKey);
          if (!limited) {
            const country = (request.headers.get('cf-ipcountry') || 'XX').toUpperCase();
            const current = parseInt(await env.visitor_map.get(country) || '0', 10);
            await env.visitor_map.put(country, String(current + 1));
            await env.visitor_map.put(rateKey, '1', { expirationTtl: 60 });
          }
        }
      }

      // Both GET and POST return all counts
      const list = await env.visitor_map.list();
      const counts = {};
      for (const key of list.keys) {
        if (key.name.startsWith('rate:')) continue;
        counts[key.name] = parseInt(await env.visitor_map.get(key.name) || '0', 10);
      }

      return new Response(JSON.stringify(counts), {
        headers: { ...headers, 'Content-Type': 'application/json' }
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500, headers: { ...headers, 'Content-Type': 'application/json' }
      });
    }
  }
};
// _var_2
