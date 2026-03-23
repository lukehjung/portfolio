"use client";

import React, { useState, useMemo } from 'react';
import { EsportsSearch } from './components/EsportsSearch';
import { TeamCard, PlayerCard } from './components/EsportsCard';
import { Team, Player } from './api';

interface EsportsClientProps {
  initialTeams: Team[];
  initialPlayers: Player[];
}

export default function EsportsClient({ initialTeams, initialPlayers }: EsportsClientProps) {
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'teams' | 'players'>('teams');

  // Add highly recognizable teams to top if no query, else filter all 300+ teams
  const filteredTeams = useMemo(() => {
    if (!query) {
      // Just show top recognizable teams if empty to not overwhelm
      const topSlugs = ['t1', 'geng', 'g2', 'c9', 'blg', 'tl', 'fnc', 'wbg', 'fly'];
      return initialTeams.filter(t => topSlugs.includes(t.acronym.toLowerCase())).slice(0, 12);
    }
    // Deep Normalization: Strip all spaces and punctuation from the search query
    const safeQuery = query.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

    return initialTeams.filter(team => {
      const safeName = team.name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      const safeAcronym = team.acronym.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      const safeRegion = team.region.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      
      return safeName.includes(safeQuery) || 
             safeAcronym.includes(safeQuery) ||
             safeRegion.includes(safeQuery);
    }).slice(0, 50); // cap at 50 to prevent huge dom
  }, [query, initialTeams]);

  const filteredPlayers = useMemo(() => {
    if (!query) {
      return initialPlayers.slice(0, 12); // just some random top players
    }
    const safeQuery = query.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

    return initialPlayers.filter(player => {
      const safeName = player.summoner_name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      const safeRole = player.role.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      
      return safeName.includes(safeQuery) || safeRole.includes(safeQuery);
    }).slice(0, 50);
  }, [query, initialPlayers]);

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-slate-200 font-sans selection:bg-cyan-500/30">
      {/* Background patterns */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-[0.03] mix-blend-screen" 
           style={{ backgroundImage: 'radial-gradient(circle at center, #ffffff 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] bg-gradient-to-b from-cyan-900/20 via-blue-900/5 to-transparent blur-3xl rounded-full pointer-events-none z-0"></div>

      {/* Main Content */}
      <main className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-24">
        
        {/* Header Hero */}
        <div className="text-center mb-16 space-y-6">
          <div className="inline-flex items-center justify-center gap-2 px-4 py-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 text-sm font-bold uppercase tracking-widest shadow-[0_0_15px_rgba(6,182,212,0.2)]">
            <i className="fa fa-globe"></i> Live Global Database
          </div>
          <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 drop-shadow-lg">
              Legends
            </span>
            <br />
            <span className="text-white drop-shadow-[0_2px_10px_rgba(255,255,255,0.1)]">Esports Hub</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto font-medium">
            Explore {initialTeams.length}+ teams and {initialPlayers.length}+ players from the official competitive League of Legends ecosystem.
          </p>
        </div>

        {/* Search Interface */}
        <div className="mb-16">
          <EsportsSearch 
            query={query} 
            setQuery={setQuery} 
            activeTab={activeTab} 
            setActiveTab={setActiveTab} 
          />
        </div>

        {/* Results */}
        <div className="space-y-8 min-h-[400px]">
          {activeTab === 'teams' ? (
            <div>
              <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-8">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <i className="fa fa-users text-cyan-500"></i> {query ? 'Search Results' : 'Featured Teams'}
                </h2>
                <span className="text-slate-500 text-sm font-semibold">{filteredTeams.length} results</span>
              </div>
              
              {filteredTeams.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredTeams.map(team => (
                    <TeamCard key={team.id} team={team} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-20 bg-slate-800/20 rounded-2xl border border-slate-800 border-dashed">
                  <i className="fa fa-search text-4xl text-slate-600 mb-4"></i>
                  <h3 className="text-xl font-bold text-slate-300">No teams found</h3>
                  <p className="text-slate-500 mt-2">Try adjusting your search query.</p>
                </div>
              )}
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-8">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <i className="fa fa-user-circle text-purple-500"></i> {query ? 'Search Results' : 'Featured Players'}
                </h2>
                <span className="text-slate-500 text-sm font-semibold">{filteredPlayers.length} results</span>
              </div>

              {filteredPlayers.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredPlayers.map(player => {
                    const team = initialTeams.find(t => t.id === player.team_id);
                    return <PlayerCard key={player.id} player={player} team={team} />;
                  })}
                </div>
              ) : (
                <div className="text-center py-20 bg-slate-800/20 rounded-2xl border border-slate-800 border-dashed">
                  <i className="fa fa-search text-4xl text-slate-600 mb-4"></i>
                  <h3 className="text-xl font-bold text-slate-300">No players found</h3>
                  <p className="text-slate-500 mt-2">Try adjusting your search query.</p>
                </div>
              )}
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
