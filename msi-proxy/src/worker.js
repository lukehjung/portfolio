const MSI_CACHE_KEY = 'msi:aggregate';
const PARTICIPANTS_KEY = 'pickems:participants';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const json = (body, init = {}) =>
  new Response(typeof body === 'string' ? body : JSON.stringify(body), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
      ...(init.headers || {}),
    },
  });

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);

    if (url.pathname === '/api/msi' && request.method === 'GET') {
      const value = await env.MSI_CACHE.get(MSI_CACHE_KEY);
      if (!value) {
        return json(
          { error: 'no data yet; the scrape workflow has not run' },
          { status: 503, headers: { 'Cache-Control': 'public, max-age=30' } }
        );
      }
      return new Response(value, {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=60',
          ...corsHeaders,
        },
      });
    }

    if (url.pathname === '/api/participants') {
      if (request.method === 'GET') {
        const value = await env.MSI_CACHE.get(PARTICIPANTS_KEY);
        return new Response(value ?? '[]', {
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store',
            ...corsHeaders,
          },
        });
      }

      if (request.method === 'PUT') {
        let body;
        try {
          body = await request.json();
        } catch {
          return json({ error: 'invalid json' }, { status: 400 });
        }
        if (!Array.isArray(body)) {
          return json({ error: 'expected an array of participants' }, { status: 400 });
        }
        await env.MSI_CACHE.put(PARTICIPANTS_KEY, JSON.stringify(body));
        return json({ ok: true, count: body.length });
      }

      return json({ error: 'method not allowed' }, { status: 405 });
    }

    return new Response('not found', { status: 404, headers: corsHeaders });
  },
};
