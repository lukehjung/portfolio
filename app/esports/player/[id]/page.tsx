import React from 'react';
import { fetchEsportsData, fetchTeamMatches } from '../../api';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export async function generateStaticParams() {
  const { players } = await fetchEsportsData();
  // We explicitly map only the ID to allow successful Next.js export
  return players.map((p) => ({
    id: String(p.id),
  }));
}

export default async function PlayerDetailsPage({ params }: { params: { id: string } }) {
  const { id } = await params;
  const { teams, players } = await fetchEsportsData();
  
  const player = players.find(p => String(p.id) === id);
  
  if (!player) {
    notFound();
  }

  const team = teams.find(t => t.id === player.team_id);
  const matches = team ? await fetchTeamMatches(team.acronym, team.region) : [];

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white font-sans selection:bg-purple-500/30">
        {/* Navigation Bar */}
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 relative z-20 flex items-center justify-between border-b border-slate-800/50 mb-8">
            <Link href={team ? `/esports/team/${team.id}` : "/esports"} className="flex items-center gap-2 text-slate-400 hover:text-purple-400 transition-colors bg-slate-800/50 px-4 py-2 rounded-full text-sm font-bold uppercase tracking-wider backdrop-blur-sm border border-slate-700 hover:border-purple-500/50">
                <i className="fa fa-arrow-left"></i> {team ? `Back to ${team.acronym}` : 'Back to Hub'}
            </Link>
        </div>

        {/* Dynamic Glow Background */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-[400px] bg-gradient-to-b from-purple-900/40 via-purple-900/10 to-transparent blur-3xl rounded-full pointer-events-none z-0"></div>
        <div className="fixed inset-0 z-0 pointer-events-none opacity-[0.02] mix-blend-screen" 
           style={{ backgroundImage: 'radial-gradient(circle at center, #ffffff 1px, transparent 1px)', backgroundSize: '16px 16px' }}></div>

        <main className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
            
            {/* Player Header */}
            <div className="bg-slate-900/80 border border-slate-800 backdrop-blur-md rounded-3xl p-8 mb-16 shadow-2xl flex flex-col md:flex-row items-center gap-10">
                <div className="relative shrink-0 w-40 h-40 md:w-56 md:h-56 bg-slate-950/80 rounded-full flex items-center justify-center p-2 border-2 border-slate-700 overflow-hidden shadow-[0_0_30px_rgba(168,85,247,0.15)] group">
                    <img src={player.image_url} alt={player.summoner_name} className="w-full h-full object-cover object-top filter grayscale group-hover:grayscale-0 transition-all duration-700" />
                </div>
                
                <div className="text-center md:text-left">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 font-bold uppercase tracking-widest text-xs text-purple-400 mb-4">
                        <i className="fa fa-gamepad"></i> {player.role}
                    </div>
                    <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-4 text-white drop-shadow-md">
                        {player.summoner_name}
                    </h1>
                    {team && (
                        <h2 className="text-2xl font-bold text-slate-400 flex items-center gap-3 justify-center md:justify-start bg-slate-800/50 px-5 py-2 rounded-xl border border-slate-700/50 w-fit mx-auto md:mx-0">
                            <img src={team.image_url} alt={team.name} className="w-8 h-8 object-contain" />
                            {team.name} <span className="text-slate-500">|</span> <span className="text-cyan-400">{team.region}</span>
                        </h2>
                    )}
                </div>
            </div>

            {/* Match History */}
            <div className="mt-16">
                <div className="flex items-center gap-3 border-b border-slate-800 pb-4 mb-8">
                    <i className="fa fa-history text-2xl text-purple-500"></i>
                    <h2 className="text-3xl font-bold">Recent Competitive Matches</h2>
                    <span className="ml-auto text-slate-500 font-medium bg-slate-800/50 px-3 py-1 rounded-lg border border-slate-700">
                        {matches.length} Matches Found
                    </span>
                </div>

                {matches.length > 0 ? (
                    <div className="flex flex-col gap-4">
                        {matches.map(match => (
                            <Link href={`/esports/match?id=${match.id}`} key={match.id} className="group flex flex-col md:flex-row items-center justify-between bg-slate-900/50 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-600 rounded-2xl p-6 transition-colors shadow-lg cursor-pointer">
                                
                                {/* Date & Event Info */}
                                <div className="flex flex-col text-center md:text-left md:w-1/4 mb-4 md:mb-0">
                                    <span className="text-slate-400 text-sm font-semibold tracking-wider uppercase">{new Date(match.startTime).toLocaleDateString()}</span>
                                    <span className="text-white font-bold text-lg">{match.league}</span>
                                    <span className="text-slate-500 text-xs mt-1 bg-slate-800 px-2 py-0.5 rounded-md w-fit border border-slate-700 mx-auto md:mx-0">{match.blockName}</span>
                                </div>

                                {/* Scoreboard */}
                                <div className="flex items-center gap-4 sm:gap-6 md:w-2/4 justify-center">
                                    <div className="text-right flex flex-col items-end">
                                        <span className={`text-xl sm:text-2xl font-black ${match.result === 'win' ? 'text-purple-400' : 'text-slate-300'}`}>{team?.acronym}</span>
                                        <span className="text-slate-500 text-xs sm:text-sm font-bold uppercase tracking-widest">{match.result}</span>
                                    </div>
                                    
                                    <div className="bg-slate-950 px-4 sm:px-6 py-2 sm:py-3 rounded-2xl border border-slate-800 flex items-center gap-3 sm:gap-4 text-2xl sm:text-3xl font-black shadow-inner">
                                        <span className={match.result === 'win' ? 'text-emerald-400' : 'text-slate-500'}>{match.teamWins}</span>
                                        <span className="text-slate-700 text-xl">-</span>
                                        <span className={match.result === 'loss' ? 'text-emerald-400' : 'text-slate-500'}>{match.opponentWins}</span>
                                    </div>

                                    <div className="text-left flex flex-col items-start">
                                        <div className="flex items-center gap-2 sm:gap-3">
                                            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-slate-950 p-1 border border-slate-800 items-center justify-center flex">
                                                {match.opponent.image_url && <img src={match.opponent.image_url} alt={match.opponent.acronym} className="w-full object-contain" />}
                                            </div>
                                            <span className={`text-xl sm:text-2xl font-black ${match.result === 'loss' ? 'text-purple-400' : 'text-slate-300'}`}>{match.opponent.acronym || match.opponent.name}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Format Info */}
                                <div className="text-center md:text-right md:w-1/4 mt-4 md:mt-0 text-slate-500 font-bold uppercase tracking-widest text-sm flex items-center justify-end gap-3">
                                    <span className="border border-slate-700 bg-slate-800/50 px-3 py-1 rounded-full">BO{match.bestOf}</span>
                                    <i className="fa fa-chevron-right text-cyan-500/0 group-hover:text-purple-500 transition-colors"></i>
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-24 bg-slate-900/50 rounded-2xl border border-slate-800 border-dashed">
                        <i className="fa fa-history text-5xl text-slate-700 mb-6 block"></i>
                        <h3 className="text-2xl font-bold text-slate-400">No Professional History Hosted Here</h3>
                        <p className="text-slate-500 mt-2 max-w-md mx-auto">This player possesses no recent verified competitive match data under their current club affiliation.</p>
                    </div>
                )}
            </div>

        </main>
    </div>
  );
}
