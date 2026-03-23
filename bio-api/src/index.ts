export interface Env {
  GEMINI_API_KEY: string;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
  "Access-Control-Max-Age": "86400",
};

export default {
  async fetch(request: Request, env: Env, ctx: any): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const type = url.searchParams.get('type');
    const name = url.searchParams.get('name');
    const role = url.searchParams.get('role');
    const team = url.searchParams.get('team');

    if (!type || !name) {
      return new Response(JSON.stringify({ error: "Missing type or name parameter" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    if (!env.GEMINI_API_KEY || env.GEMINI_API_KEY === "dummy_for_local_dev") {
      return new Response(JSON.stringify({
        summary: "Cloudflare Edge Worker functioning securely! Please run `npx wrangler secret put GEMINI_API_KEY` to link your LLM.",
        height: "Unknown",
        age: "Unknown",
        nationality: "Unknown",
        placeOfBirth: "Unknown"
      }), { headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    let prompt = `You are an expert encyclopedic historian of League of Legends Esports. `;
    if (type === 'player') {
         prompt += `Provide a highly accurate, professional biography for the pro player "${name}". They are known as a "${role || 'pro'}" and have played for "${team || 'various teams'}".`;
    } else {
         prompt += `Provide a highly accurate, professional biography for the professional team "${name}".`;
    }
    prompt += `\nRespond STRICTLY in valid JSON format matching this exact structure, with no markdown code blocks wrapping it:
    {
      "summary": "A 2-paragraph professional synopsis covering their career/history and notable achievements.",
      "height": "Estimated or known height, or 'Unknown'",
      "age": "Current age or Year Founded, or 'Unknown'",
      "nationality": "Primary nationality or region, or 'Unknown'",
      "placeOfBirth": "City/Country of origin, or 'Unknown'"
    }`;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${env.GEMINI_API_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json", temperature: 0.2 }
          })
        });

        const json: any = await response.json();
        const textOutput = json?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
        
        let parsedData;
        try {
          parsedData = JSON.parse(textOutput);
        } catch(e) {
          const cleaned = textOutput.replace(/```json/g, '').replace(/```/g, '').trim();
          parsedData = JSON.parse(cleaned);
        }

        return new Response(JSON.stringify(parsedData), {
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });

    } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
    }
  },
};
