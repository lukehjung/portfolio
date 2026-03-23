import { GoogleGenAI } from '@google/genai';
import { NextResponse } from 'next/server';

// Initialize the SDK directly with the environment variable
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

const CACHE = new Map<string, any>();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const name = searchParams.get('name');
    const role = searchParams.get('role');
    const team = searchParams.get('team');
    
    if (!name || !type) {
      return NextResponse.json({ error: 'Missing name or type parameter' }, { status: 400 });
    }

    // Build a unique cache key
    const cacheKey = `${type}-${name}-${team || ''}`;
    if (CACHE.has(cacheKey)) {
      return NextResponse.json(CACHE.get(cacheKey));
    }

    if (!process.env.GEMINI_API_KEY) {
        return NextResponse.json({ 
            summary: "API Key missing. Please add GEMINI_API_KEY to your .env.local file to generate this biography.",
            height: "Unknown",
            age: "Unknown",
            nationality: "Unknown",
            placeOfBirth: "Unknown"
        });
    }

    let prompt = '';
    
    if (type === 'player') {
      prompt = `
      You are an expert encyclopedic historian of League of Legends Esports.
      Provide a highly accurate, professional biography for the pro player "${name}".
      They are known as a "${role}" and have played for "${team}".
      
      Respond STRICTLY in valid JSON format matching this exact structure, with no markdown code blocks wrapping it:
      {
        "summary": "A 2-paragraph professional synopsis covering their career, notable achievements, and playstyle.",
        "height": "Their estimated or known height (e.g., '1.75m'), or 'Unknown'",
        "age": "Their current age or 'Unknown'",
        "nationality": "Their primary nationality (e.g., 'South Korea')",
        "placeOfBirth": "City, Country (if known, else 'Unknown')"
      }`;
    } else if (type === 'team') {
       prompt = `
      You are an expert encyclopedic historian of League of Legends Esports.
      Provide a highly accurate, professional biography for the professional team "${name}".
      
      Respond STRICTLY in valid JSON format matching this exact structure, with no markdown code blocks wrapping it:
      {
        "summary": "A 2-paragraph professional synopsis covering the organization's history, legacy, and notable world championship/regional success.",
        "height": "N/A",
        "age": "Year Founded (e.g., '2013'), or 'Unknown'",
        "nationality": "Primary Region/Country (e.g., 'South Korea' or 'North America')",
        "placeOfBirth": "Headquarters City (if known, else 'Unknown')"
      }`;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
          responseMimeType: "application/json",
          temperature: 0.2
      }
    });

    const outputText = response.text || "{}";
    
    // Safety parse
    let parsedData;
    try {
        parsedData = JSON.parse(outputText);
    } catch (e) {
        // Fallback if the AI returns markdown ticks despite responseMimeType
        const cleaned = outputText.replace(/```json/g, '').replace(/```/g, '').trim();
        parsedData = JSON.parse(cleaned);
    }

    // Store in global memory cache (persists during the Next.js runtime lifecycle)
    CACHE.set(cacheKey, parsedData);

    return NextResponse.json(parsedData);

  } catch (error: any) {
    console.error("AI Generation Failed:", error);
    return NextResponse.json({ error: error.message || 'Failed to generate biography' }, { status: 500 });
  }
}
