'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { MatchScoreboard } from '../components/MatchScoreboard';

const API_KEY = '0TvQnueqKa5mxJntVWt0w4LpLfEkrV1Ta8rQBb9Z';

function MatchDetailsContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');

  const [matchData, setMatchData] = useState<any>(null);
  const [team1, setTeam1] = useState<any>(null);
  const [team2, setTeam2] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!id) return;
      try {
        const res = await fetch(`https://esports-api.lolesports.com/persisted/gw/getEventDetails?hl=en-US&id=${id}`, {
          headers: { 'x-api-key': API_KEY }
        });
        const data = await res.json();
        const event = data?.data?.event;
        if (!event || !event.match) { setLoading(false); return; }

        const matchObj = event.match;
        const parsedGames = matchObj.games.map((g: any) => {
          let vodParam = undefined;
          if (g.vods && g.vods.length > 0) {
            const enVod = g.vods.find((v: any) => v.locale === 'en-US' && v.provider === 'youtube');
            const anyYoutube = g.vods.find((v: any) => v.provider === 'youtube');
            const finalVod = enVod || anyYoutube || g.vods[0];
            vodParam = finalVod?.parameter;
          }
          const blueTeam = g.teams?.find((t: any) => t.side === 'blue');
          const redTeam = g.teams?.find((t: any) => t.side === 'red');
          return {
            id: g.id,
            number: g.number,
            state: g.state,
            blueTeamId: blueTeam?.id || '',
            redTeamId: redTeam?.id || '',
            vodParameter: vodParam
          };
        });

        const mappedMatch = {
          id: event.id,
          teams: matchObj.teams.map((t: any) => ({
            id: t.id,
            name: t.name,
            acronym: t.code,
            wins: t.result?.gameWins || 0
          })),
          games: parsedGames
        };
        
        setMatchData(mappedMatch);

        // Fetch team logos
        const teamsRes = await fetch('https://esports-api.lolesports.com/persisted/gw/getTeams?hl=en-US', {
            headers: { 'x-api-key': API_KEY }
        });
        const teamsData = await teamsRes.json();
        const allTeams = teamsData?.data?.teams || [];

        const t1Api = mappedMatch.teams[0];
        const t2Api = mappedMatch.teams[1];

        const t1Raw = allTeams.find((t: any) => t.id === t1Api?.id);
        const t2Raw = allTeams.find((t: any) => t.id === t2Api?.id);

        setTeam1({ id: t1Raw?.id || 'unknown', name: t1Api?.name, acronym: t1Api?.acronym, image_url: t1Raw?.image || '' });
        setTeam2({ id: t2Raw?.id || 'unknown', name: t2Api?.name, acronym: t2Api?.acronym, image_url: t2Raw?.image || '' });
        
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  if (loading) {
      return <div className="min-h-[60vh] flex items-center justify-center text-cyan-400"><i className="fa fa-circle-o-notch fa-spin text-4xl"></i></div>;
  }

  if (!matchData) {
      return <div className="min-h-[60vh] flex items-center justify-center text-slate-400 font-bold">Match data could not be found.</div>;
  }

  const gamesPlayed = matchData.games.filter((g:any) => g.state === 'completed').length;
  const bestOf = matchData.games.length;

  return (
    <div className="w-full flex flex-col items-center">
        {/* Match Header VS Board */}
        <div className="w-full bg-slate-900/80 border border-slate-800 backdrop-blur-md rounded-3xl p-8 mb-8 shadow-2xl flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16">
            
            {/* Team 1 */}
            <div className="flex flex-col items-center text-center w-48">
                <div className="w-32 h-32 md:w-40 md:h-40 bg-slate-950/80 rounded-2xl flex items-center justify-center p-4 border-2 border-slate-800 shadow-[0_0_30px_rgba(255,255,255,0.05)] mb-4 transition-transform hover:scale-105">
                    {team1.image_url ? <img src={team1.image_url} alt={team1.name} className="w-full object-contain filter drop-shadow-[0_0_12px_rgba(255,255,255,0.1)]" /> : <i className="fa fa-shield text-5xl text-slate-700"></i>}
                </div>
                <h2 className="text-3xl font-black">{team1.acronym}</h2>
                <span className="text-slate-400 font-bold">{team1.name}</span>
            </div>

            {/* Score */}
            <div className="flex flex-col items-center justify-center">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-slate-700 bg-slate-800 font-bold uppercase tracking-widest text-xs text-slate-300 mb-6">
                    Best of {bestOf}
                </div>
                
                <div className="flex items-center gap-6 md:gap-8">
                    <span className={`text-6xl md:text-8xl font-black ${matchData.teams[0]?.wins > (matchData.teams[1]?.wins || 0) ? 'text-emerald-400 drop-shadow-[0_0_20px_rgba(52,211,153,0.3)]' : 'text-slate-500'}`}>
                        {matchData.teams[0]?.wins || 0}
                    </span>
                    <span className="text-4xl text-slate-700 font-black">-</span>
                    <span className={`text-6xl md:text-8xl font-black ${matchData.teams[1]?.wins > (matchData.teams[0]?.wins || 0) ? 'text-emerald-400 drop-shadow-[0_0_20px_rgba(52,211,153,0.3)]' : 'text-slate-500'}`}>
                        {matchData.teams[1]?.wins || 0}
                    </span>
                </div>

                <div className="mt-6 text-slate-500 font-bold tracking-widest uppercase text-sm">
                    {gamesPlayed} Games Played
                </div>
            </div>

            {/* Team 2 */}
            <div className="flex flex-col items-center text-center w-48">
                <div className="w-32 h-32 md:w-40 md:h-40 bg-slate-950/80 rounded-2xl flex items-center justify-center p-4 border-2 border-slate-800 shadow-[0_0_30px_rgba(255,255,255,0.05)] mb-4 transition-transform hover:scale-105">
                    {team2.image_url ? <img src={team2.image_url} alt={team2.name} className="w-full object-contain filter drop-shadow-[0_0_12px_rgba(255,255,255,0.1)]" /> : <i className="fa fa-shield text-5xl text-slate-700"></i>}
                </div>
                <h2 className="text-3xl font-black">{team2.acronym}</h2>
                <span className="text-slate-400 font-bold">{team2.name}</span>
            </div>

        </div>

        {/* Scoreboard and VODs */}
        <div className="w-full">
            <MatchScoreboard matchData={matchData} team1={team1} team2={team2} />
        </div>
    </div>
  );
}

export default function MatchDetailsPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white font-sans selection:bg-rose-500/30">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 relative z-20 flex items-center justify-between border-b border-slate-800/50 mb-8">
            <Link href="/esports" className="flex items-center gap-2 text-slate-400 hover:text-rose-400 transition-colors bg-slate-800/50 px-4 py-2 rounded-full text-sm font-bold uppercase tracking-wider backdrop-blur-sm border border-slate-700 hover:border-rose-500/50">
                <i className="fa fa-arrow-left"></i> Back to Hub
            </Link>
        </div>

        {/* Dynamic Glow Background */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-[400px] bg-gradient-to-b from-rose-900/20 via-orange-900/10 to-transparent blur-3xl rounded-full pointer-events-none z-0"></div>
        <div className="fixed inset-0 z-0 pointer-events-none opacity-[0.02] mix-blend-screen" 
           style={{ backgroundImage: 'radial-gradient(circle at center, #ffffff 1px, transparent 1px)', backgroundSize: '16px 16px' }}></div>

        <main className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24 flex flex-col items-center">
            <Suspense fallback={<div className="min-h-[60vh] flex items-center justify-center text-cyan-400"><i className="fa fa-circle-o-notch fa-spin text-4xl"></i></div>}>
              <MatchDetailsContent />
            </Suspense>
        </main>
    </div>
  );
}
