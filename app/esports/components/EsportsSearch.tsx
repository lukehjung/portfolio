"use client";

import React from 'react';

interface EsportsSearchProps {
  query: string;
  setQuery: (q: string) => void;
  activeTab: 'teams' | 'players';
  setActiveTab: (t: 'teams' | 'players') => void;
}

export const EsportsSearch = ({ query, setQuery, activeTab, setActiveTab }: EsportsSearchProps) => {
  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      {/* Search Bar */}
      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <i className="fa fa-search text-slate-400 group-focus-within:text-cyan-400 transition-colors"></i>
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for teams or players..."
          className="w-full bg-slate-800/50 border border-slate-700 text-white rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 shadow-inner backdrop-blur-sm transition-all text-lg placeholder-slate-500 appearance-none"
        />
        {/* Glow effect behind input */}
        <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-2xl blur opacity-0 group-focus-within:opacity-20 transition duration-500 pointer-events-none"></div>
      </div>

      {/* Tabs */}
      <div className="flex justify-center gap-4">
        <button
          onClick={() => setActiveTab('teams')}
          className={`px-6 py-2 rounded-full text-sm font-bold uppercase tracking-wider transition-all duration-200 ${
            activeTab === 'teams'
              ? 'bg-cyan-500 text-slate-900 shadow-[0_0_15px_rgba(6,182,212,0.4)]'
              : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
          }`}
        >
          Teams
        </button>
        <button
          onClick={() => setActiveTab('players')}
          className={`px-6 py-2 rounded-full text-sm font-bold uppercase tracking-wider transition-all duration-200 ${
            activeTab === 'players'
              ? 'bg-purple-500 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)]'
              : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
          }`}
        >
          Players
        </button>
      </div>
    </div>
  );
};
