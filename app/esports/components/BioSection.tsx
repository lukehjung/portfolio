"use client";

import React, { useEffect, useState } from 'react';

interface BioSectionProps {
  type: 'player' | 'team';
  name: string;
  role?: string;
  team?: string;
  region?: string;
}

export const BioSection = ({ type, name, role, team, region }: BioSectionProps) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBio = async () => {
      // In production, you would use an environment variable (e.g., process.env.NEXT_PUBLIC_WORKER_URL)
      // For local testing with Wrangler, we natively target port 8787
      const workerUrl = process.env.NEXT_PUBLIC_BIO_API_URL || 'http://localhost:8787';
      
      let url = `${workerUrl}?type=${type}&name=${encodeURIComponent(name)}`;
      if (role) url += `&role=${encodeURIComponent(role)}`;
      if (team) url += `&team=${encodeURIComponent(team)}`;
      if (region) url += `&region=${encodeURIComponent(region)}`;

      try {
        const response = await fetch(url);
        const parsedData = await response.json();
        
        // Diagnostic log: Check your browser's console (F12) to see this!
        console.log("AI Worker Data Incoming:", parsedData);
        
        setData(parsedData);
      } catch (err) {
        console.error("Cloudflare Worker Connection Error:", err);
        setData({ error: "Failed to reach edge network." });
      } finally {
        setLoading(false);
      }
    };

    fetchBio();
  }, [type, name, role, team, region]);

  if (loading) {
    return (
      <div className="w-full bg-slate-900/50 border border-slate-800 rounded-3xl p-8 mb-12 animate-pulse flex flex-col items-center justify-center min-h-[250px] shadow-lg text-center">
         <div className="w-12 h-12 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mb-4 mx-auto"></div>
         <p className="text-cyan-400 font-semibold tracking-widest uppercase text-sm">Synthesizing AI Biography...</p>
      </div>
    );
  }

  // Fail gracefully if no summary and no diagnostic data is present
  if (!data || (data.error && !data.summary)) {
    return null;
  }

  return (
    <div className="w-full bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-3xl p-8 mb-12 shadow-2xl relative overflow-hidden group">
      {/* Glow Effect */}
      <div className="absolute top-0 right-0 -mt-20 -mr-20 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none transition duration-700 group-hover:bg-cyan-500/20"></div>

      <h3 className="text-2xl font-black text-white uppercase tracking-wider mb-6 flex items-center gap-3">
        <i className="fa fa-address-card text-cyan-500"></i> AI Synopsis
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Left Col: Metadata */}
        <div className="col-span-1 border-r border-slate-800/50 pr-6 space-y-6">
          
          <div>
            <span className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Age</span>
            <span className="text-lg font-semibold text-slate-200">{data.age || 'Unknown'}</span>
          </div>

          {type === 'player' && (
            <div>
              <span className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Height</span>
              <span className="text-lg font-semibold text-slate-200">{data.height || 'Unknown'}</span>
            </div>
          )}

          <div>
            <span className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">{type === 'team' ? 'Region' : 'Nationality'}</span>
            <span className="text-lg font-semibold text-slate-200 flex items-center gap-2">
               {data.nationality || 'Unknown'}
            </span>
          </div>

          <div>
            <span className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Origin</span>
            <span className="text-sm font-semibold text-slate-400">{data.placeOfBirth || 'Unknown'}</span>
          </div>
          
        </div>

        {/* Right Col: Biography */}
        <div className="col-span-1 md:col-span-3">
           <div className="prose prose-invert prose-p:text-slate-300 prose-p:leading-relaxed max-w-none">
             {data.summary ? (
               // Split by double newlines or single newlines that look like paragraphs
               data.summary.split(/\n\n|\r\n\r\n|\n|\\n/).map((paragraph: string, idx: number) => (
                 paragraph.trim() && <p key={idx} className="mb-4 text-base md:text-lg opacity-90">{paragraph.trim()}</p>
               ))
             ) : (
               <p className="text-slate-500 italic">Biography data not returned from LLM. check console for diagnostics.</p>
             )}
           </div>
        </div>
      </div>
    </div>
  );
};
