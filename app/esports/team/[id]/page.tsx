import React from 'react';
import { fetchEsportsData, fetchTeamMatches, Match } from '../../api';
import { PlayerCard } from '../../components/EsportsCard';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export async function generateStaticParams() {
  const { teams } = await fetchEsportsData();
  return teams.map((team) => ({
    id: String(team.id),
  }));
}

export default async function TeamDetailsPage({ params }: { params: { id: string } }) {
  const { id } = await params; // Next.js 16 handles params as Promise in some server contexts, but standard is fine
  const { teams, players } = await fetchEsportsData();
  
  const team = teams.find(t => t.id === id || t.acronym.toLowerCase() === id.toLowerCase());
  
  if (!team) {
    notFound();
  }

  const teamPlayers = players.filter(p => p.team_id === team.id);
  const matches = await fetchTeamMatches(team.acronym, team.region);

  // Group into Main Roster and Substitutes
  const mainRoster: typeof players = [];
  const substitutes: typeof players = [];
  const filledRoles = new Set();
  const roleOrder = ['top', 'jungle', 'mid', 'bottom', 'support'];

  const sortedPlayers = [...teamPlayers].sort((a, b) => {
      // 1. Sort by Role Order
      const aRoleIndex = roleOrder.indexOf(a.role?.toLowerCase());
      const bRoleIndex = roleOrder.indexOf(b.role?.toLowerCase());
      
      const aValidRole = aRoleIndex !== -1;
      const bValidRole = bRoleIndex !== -1;
      
      if (aValidRole && !bValidRole) return -1;
      if (!aValidRole && bValidRole) return 1;
      
      if (aValidRole && bValidRole && aRoleIndex !== bRoleIndex) {
          return aRoleIndex - bRoleIndex;
      }
      
      // 2. Tie-breaker for same role: prioritize true starters
      // Heuristic: Starters usually have their name in their official media asset URL, while subs often have generic "image-123.png"
      const aIsMain = a.image_url.toLowerCase().includes(a.summoner_name.toLowerCase()) ? 1 : 0;
      const bIsMain = b.image_url.toLowerCase().includes(b.summoner_name.toLowerCase()) ? 1 : 0;
      
      if (aIsMain !== bIsMain) {
          return bIsMain - aIsMain;
      }
      
      return 0;
  });

  sortedPlayers.forEach(player => {
      const roleKey = player.role?.toLowerCase();
      if (roleOrder.includes(roleKey) && !filledRoles.has(roleKey)) {
          filledRoles.add(roleKey);
          mainRoster.push(player);
      } else {
          substitutes.push(player);
      }
  });

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white font-sans selection:bg-cyan-500/30">
        {/* Navigation Bar */}
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 relative z-20 flex items-center justify-between border-b border-slate-800/50 mb-8">
            <Link href="/esports" className="flex items-center gap-2 text-slate-400 hover:text-cyan-400 transition-colors bg-slate-800/50 px-4 py-2 rounded-full text-sm font-bold uppercase tracking-wider backdrop-blur-sm border border-slate-700 hover:border-cyan-500/50">
                <i className="fa fa-arrow-left"></i> Back to Hub
            </Link>
        </div>

        {/* Dynamic Glow Background */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-[400px] bg-gradient-to-b from-cyan-900/40 via-blue-900/10 to-transparent blur-3xl rounded-full pointer-events-none z-0"></div>
        <div className="fixed inset-0 z-0 pointer-events-none opacity-[0.02] mix-blend-screen" 
           style={{ backgroundImage: 'radial-gradient(circle at center, #ffffff 1px, transparent 1px)', backgroundSize: '16px 16px' }}></div>

        <main className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
            
            {/* Team Header */}
            <div className="bg-slate-900/80 border border-slate-800 backdrop-blur-md rounded-3xl p-8 mb-16 shadow-2xl flex flex-col md:flex-row items-center gap-10">
                <div className="relative w-40 h-40 md:w-56 md:h-56 bg-slate-950/80 rounded-2xl flex items-center justify-center p-6 border-2 border-slate-800 shadow-[0_0_30px_rgba(34,211,238,0.1)]">
                    <img src={team.image_url} alt={team.name} className="w-full object-contain filter drop-shadow-[0_0_12px_rgba(255,255,255,0.15)]" />
                </div>
                
                <div className="text-center md:text-left">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-slate-700 bg-slate-800 font-bold uppercase tracking-widest text-xs text-slate-300 mb-4">
                        <i className="fa fa-map-marker text-cyan-400"></i> {team.region} Region
                    </div>
                    <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-2">
                        {team.name}
                    </h1>
                    <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
                        {team.acronym}
                    </h2>
                </div>
            </div>

            {/* Main Roster */}
            <div>
                <div className="flex items-center gap-3 border-b border-slate-800 pb-4 mb-8">
                    <i className="fa fa-star text-2xl text-yellow-500"></i>
                    <h2 className="text-3xl font-bold">Starting Roster</h2>
                    <span className="ml-auto text-slate-500 font-medium bg-slate-800/50 px-3 py-1 rounded-lg border border-slate-700">
                        {mainRoster.length} Players
                    </span>
                </div>

                {mainRoster.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                        {mainRoster.map(player => (
                            <PlayerCard key={player.id} player={player} team={team} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-24 bg-slate-900/50 rounded-2xl border border-slate-800 border-dashed">
                        <i className="fa fa-user-slash text-5xl text-slate-700 mb-6 block"></i>
                        <h3 className="text-2xl font-bold text-slate-400">No Starting Roster Found</h3>
                        <p className="text-slate-500 mt-2 max-w-md mx-auto">This team's primary roster is currently hidden or hasn't been officially tracked by the database yet.</p>
                    </div>
                )}
            </div>

            {/* Substitutes */}
            {substitutes.length > 0 && (
                <div className="mt-16">
                    <div className="flex items-center gap-3 border-b border-slate-800 pb-4 mb-8">
                        <i className="fa fa-users text-2xl text-slate-500"></i>
                        <h2 className="text-3xl font-bold text-slate-300">Substitutes & Staff</h2>
                        <span className="ml-auto text-slate-500 font-medium bg-slate-800/50 px-3 py-1 rounded-lg border border-slate-700">
                            {substitutes.length} Members
                        </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 opacity-80 hover:opacity-100 transition-opacity">
                        {substitutes.map(player => (
                            <PlayerCard key={player.id} player={player} team={team} />
                        ))}
                    </div>
                </div>
            )}

            {/* Match History */}
            <div className="mt-16">
                <div className="flex items-center gap-3 border-b border-slate-800 pb-4 mb-8">
                    <i className="fa fa-calendar-check-o text-2xl text-blue-500"></i>
                    <h2 className="text-3xl font-bold">Recent Matches</h2>
                    <span className="ml-auto text-slate-500 font-medium bg-slate-800/50 px-3 py-1 rounded-lg border border-slate-700">
                        {matches.length} Matches
                    </span>
                </div>

                {matches.length > 0 ? (
                    <div className="flex flex-col gap-4">
                        {matches.map(match => (
                            <Link href={`/esports/match?id=${match.id}`} key={match.id} className="group flex flex-col md:flex-row items-center justify-between bg-slate-900/50 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-600 rounded-2xl p-6 transition-colors shadow-lg cursor-pointer">
                                
                                {/* Date & Event Info */}
                                <div className="flex flex-col text-center md:text-left md:w-1/4 mb-4 md:mb-0">
                                    <span className="text-slate-400 text-sm font-semibold tracking-wider uppercase">{new Date(match.startTime).toLocaleDateString()}</span>
                                    <span className="text-white font-bold">{match.league}</span>
                                    <span className="text-slate-500 text-xs">{match.blockName}</span>
                                </div>

                                {/* Scoreboard */}
                                <div className="flex items-center gap-6 md:w-2/4 justify-center">
                                    <div className="text-right flex flex-col items-end">
                                        <span className={`text-2xl font-black ${match.result === 'win' ? 'text-emerald-400' : 'text-slate-300'}`}>{team.acronym}</span>
                                        <span className="text-slate-500 text-sm font-bold uppercase tracking-widest">{match.result}</span>
                                    </div>
                                    
                                    <div className="bg-slate-950 px-6 py-3 rounded-2xl border border-slate-800 flex items-center gap-4 text-3xl font-black shadow-inner">
                                        <span className={match.result === 'win' ? 'text-emerald-400' : 'text-slate-500'}>{match.teamWins}</span>
                                        <span className="text-slate-700 text-xl">-</span>
                                        <span className={match.result === 'loss' ? 'text-emerald-400' : 'text-slate-500'}>{match.opponentWins}</span>
                                    </div>

                                    <div className="text-left flex flex-col items-start">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-slate-950 p-1 border border-slate-800 hidden sm:flex items-center justify-center">
                                                {match.opponent.image_url && <img src={match.opponent.image_url} alt={match.opponent.acronym} className="w-full object-contain" />}
                                            </div>
                                            <span className={`text-2xl font-black ${match.result === 'loss' ? 'text-emerald-400' : 'text-slate-300'}`}>{match.opponent.acronym || match.opponent.name}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Format Info */}
                                <div className="text-center md:text-right md:w-1/4 mt-4 md:mt-0 text-slate-500 font-bold uppercase tracking-widest text-sm flex items-center justify-end gap-3">
                                    BO{match.bestOf}
                                    <i className="fa fa-chevron-right text-cyan-500/0 group-hover:text-cyan-500 transition-colors"></i>
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-24 bg-slate-900/50 rounded-2xl border border-slate-800 border-dashed">
                        <i className="fa fa-history text-5xl text-slate-700 mb-6 block"></i>
                        <h3 className="text-2xl font-bold text-slate-400">No Matches Found</h3>
                        <p className="text-slate-500 mt-2 max-w-md mx-auto">This team has no recent official matches recorded in the database.</p>
                    </div>
                )}
            </div>

        </main>
    </div>
  );
}
