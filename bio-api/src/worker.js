const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
  "Access-Control-Max-Age": "86400",
};

export default {
  async fetch(request, env, ctx) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const type = url.searchParams.get('type');
    const name = url.searchParams.get('name');
    const role = url.searchParams.get('role');
    const team = url.searchParams.get('team');
    const region = url.searchParams.get('region');

    if (!type || !name) {
      return new Response(JSON.stringify({ error: "Missing type or name parameter" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    // Edge Caching: Cache responses for 7 days (v2 cache buster)
    const cacheKey = new Request(request.url + "&v=2", request);
    const cache = caches.default;
    let cachedResponse = await cache.match(cacheKey);
    
    // Only return cache if it's a valid non-empty response
    if (cachedResponse && cachedResponse.headers.get("Content-Length") !== "2") {
      console.log("Edge Cache Hit:", request.url);
      return cachedResponse;
    }

    if (!env.GEMINI_API_KEY || env.GEMINI_API_KEY === "dummy_for_local_dev") {
      return new Response(JSON.stringify({
        summary: "Cloudflare Edge Worker functioning securely! Please run `npx wrangler secret put GEMINI_API_KEY` to link your LLM.",
        age: "Unknown",
        region: "Unknown",
        foundedYear: "Unknown",
        trophies: []
      }), { headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    let prompt = `You are a professional, purely encyclopedic historian of League of Legends Esports. `;
    if (type === 'player') {
         prompt += `Provide a highly accurate, professional biography for the pro player "${name}". They are known as a "${role || 'pro'}" and have played for "${team || 'various teams'}". Specifically find their career-defining major tournament trophies (Tournament name and year).`;
    } else {
         prompt += `Provide a highly accurate, professional biography for the professional team "${name}". Specifically find their founding year, their home region, and a list of their major trophies (Tournament name and year).`;
    }
    prompt += `\nRespond ONLY with the raw JSON content. Do not include any introductory text, meta-commentary, or conversational fillers.
    Respond STRICTLY in valid JSON format matching this exact structure:
    {
      "summary": "A 2-paragraph professional, objective synopsis in the third person. No introductory phrases.",
      "height": "Estimated or known height, or 'Unknown'",
      "age": "Current age (for players) or 'Unknown'",
      "nationality": "Primary nationality (for players) or 'Unknown'",
      "placeOfBirth": "City/Country of origin (for players) or 'Unknown'",
      "region": "Home region (for teams) or 'Unknown'",
      "foundedYear": "Year the organization was founded (for teams) or 'Unknown'",
      "trophies": [
        { "name": "Tournament Name", "year": "Year", "region": "Region of tournament" }
      ]
    }`;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key=${env.GEMINI_API_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json", temperature: 0.2 }
          })
        });

        if (!response.ok) {
          const errBody = await response.text();
          throw new Error(`Gemini API Error (${response.status}): ${errBody.substring(0, 100)}`);
        }

        const json = await response.json();
        
        // Check for safety filters or empty candidates
        if (!json.candidates || json.candidates.length === 0) {
          throw new Error("Gemini returned no candidates (possible safety filter)");
        }

        const textOutput = json.candidates[0].content.parts[0].text || "{}";
        
        let parsedData;
        try {
          parsedData = JSON.parse(textOutput);
        } catch(e) {
          const cleaned = textOutput.replace(/```json/g, '').replace(/```/g, '').trim();
          parsedData = JSON.parse(cleaned);
        }

        // Ensure we always have a summary
        if (!parsedData.summary) {
           parsedData.summary = "Biography synthesis in progress. Check back soon for detailed AI-generated insights.";
        }

        const finalResponse = new Response(JSON.stringify(parsedData), {
          headers: { 
            "Content-Type": "application/json", 
            ...corsHeaders,
            "Cache-Control": "public, max-age=3600" // Lower cache during debugging (1 hour)
          }
        });

        // Store in cache for next time
        ctx.waitUntil(cache.put(cacheKey, finalResponse.clone()));

        return finalResponse;

    } catch (e) {
        console.error("Worker Execution Error:", e.message);
        return new Response(JSON.stringify({ 
          error: e.message,
          summary: "The AI service is currently unavailable. Please verify your Gemini API key and model version in wrangler.toml."
        }), {
          status: 200, // Return 200 so the frontend can display the error message in the summary block
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
    }
  },
};
