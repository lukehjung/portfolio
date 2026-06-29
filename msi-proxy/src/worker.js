const CACHE_KEY = 'msi:aggregate';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    if (url.pathname !== '/api/msi') {
      return new Response('not found', { status: 404, headers: corsHeaders });
    }

    const value = await env.MSI_CACHE.get(CACHE_KEY);
    if (!value) {
      return new Response(
        JSON.stringify({ error: 'no data yet; the scrape workflow has not run' }),
        {
          status: 503,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=30',
            ...corsHeaders,
          },
        }
      );
    }

    return new Response(value, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60',
        ...corsHeaders,
      },
    });
  },
};
