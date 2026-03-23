'use client';

import React, { useState } from 'react';

// Random pseudo-generator to ensure same stats on fast refresh
const mulberry32 = (a: number) => {
    return function() {
      let t = a += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
}

// Famous generic champions for visually appealing portraits
const MOCK_CHAMPS = [
    'Aatrox', 'Ahri', 'Akali', 'Azir', 'Caitlyn', 'Ezreal', 'Fiora', 'Gnar', 'Graves', 'Jinx',
    'KaiSa', 'LeeSin', 'Lucian', 'Nautilus', 'Orianna', 'Renekton', 'Sejuani', 'Sylas', 'Thresh', 'Viego', 'XinZhao', 'Zeri', 'Rakan', 'Xayah', 'Aphelios'
];

interface Participant {
    role: string;
    championId: string;
    kills: number;
    deaths: number;
    assists: number;
    cs: number;
    gold: string;
}

interface TeamData {
    id: string;
    name: string;
    acronym: string;
    image_url: string;
}

export function MatchScoreboard({ matchData, team1, team2 }: { matchData: any, team1: TeamData, team2: TeamData }) {
    const [activeGameIndex, setActiveGameIndex] = useState(0);

    const activeGame = matchData.games[activeGameIndex];

    // Generate deterministically random KDA for 5 players per team based on Game ID parity
    const getSeed = (id: string) => [...id].reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const rng = mulberry32(getSeed(activeGame.id));

    const generateTeamStats = (): Participant[] => {
        const roles = ['Top', 'Jungle', 'Mid', 'Bottom', 'Support'];
        return roles.map(role => {
            const champ = MOCK_CHAMPS[Math.floor(rng() * MOCK_CHAMPS.length)];
            const kills = Math.floor(rng() * 12);
            const deaths = Math.floor(rng() * 10);
            const assists = Math.floor(rng() * 15);
            const cs = Math.floor((role === 'Support' ? rng() * 50 + 20 : rng() * 200 + 150));
            const gold = (cs * 25 + kills * 300 + assists * 150).toLocaleString();
            return { role, championId: champ, kills, deaths, assists, cs, gold };
        });
    }

    const blueStats = generateTeamStats();
    const redStats = generateTeamStats();

    const renderTeamBoard = (stats: Participant[], isBlue: boolean, teamObj: TeamData) => (
        <div className={`flex flex-col gap-2`}>
            {/* Team Banner */}
            <div className={`flex items-center gap-3 p-3 rounded-t-xl border-b-2 ${isBlue ? 'bg-blue-900/40 border-blue-500' : 'bg-red-900/40 border-red-500'}`}>
                {teamObj ? (
                    <>
                        <img src={teamObj.image_url} alt={teamObj.name} className="w-8 h-8 object-contain" />
                        <span className="font-black text-xl text-white">{teamObj.name}</span>
                    </>
                ) : (
                    <span className="font-black text-xl text-slate-400">Unknown Team</span>
                )}
            </div>

            {/* Players Header */}
            <div className="grid grid-cols-12 gap-2 text-xs font-bold text-slate-500 uppercase px-4 py-2 bg-slate-800/50">
                <div className="col-span-5">Champion & Role</div>
                <div className="col-span-3 text-center">K / D / A</div>
                <div className="col-span-2 text-center">CS</div>
                <div className="col-span-2 text-right">Gold</div>
            </div>

            {/* Players List */}
            {stats.map((p, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center px-4 py-3 bg-slate-900/60 hover:bg-slate-800 transition-colors border border-slate-800 rounded-lg">
                    <div className="col-span-5 flex items-center gap-3">
                        <div className="relative w-10 h-10 rounded-md overflow-hidden ring-1 ring-slate-700">
                            <img src={`https://ddragon.leagueoflegends.com/cdn/14.5.1/img/champion/${p.championId === 'XinZhao' ? 'XinZhao' : p.championId}.png`} alt={p.championId} className="w-full h-full object-cover scale-110" onError={(e) => { e.currentTarget.src = 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-icons/-1.png' }} />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-white font-bold">{p.championId}</span>
                            <span className={`text-xs ${isBlue ? 'text-blue-400' : 'text-red-400'} font-semibold uppercase`}>{p.role}</span>
                        </div>
                    </div>

                    <div className="col-span-3 text-center flex items-center justify-center gap-1 font-mono text-[15px]">
                        <span className="text-emerald-400">{p.kills}</span>
                        <span className="text-slate-600">/</span>
                        <span className="text-red-400">{p.deaths}</span>
                        <span className="text-slate-600">/</span>
                        <span className="text-yellow-400">{p.assists}</span>
                    </div>

                    <div className="col-span-2 text-center font-mono text-slate-300">
                        {p.cs}
                    </div>

                    <div className="col-span-2 text-right font-mono text-yellow-500/90 flex justify-end gap-1 items-center">
                        {p.gold}
                    </div>
                </div>
            ))}
        </div>
    );

    return (
        <div className="mt-12 flex flex-col gap-8">
            {/* Game Switcher Tabs */}
            <div className="flex flex-wrap gap-3">
                {matchData.games.map((game: any, index: number) => {
                    if (game.state === 'unneeded') return null;
                    const isActive = index === activeGameIndex;
                    return (
                        <button
                            key={game.id}
                            onClick={() => setActiveGameIndex(index)}
                            className={`px-6 py-3 rounded-full font-bold text-sm tracking-widest uppercase transition-all duration-300 border ${isActive ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50 shadow-[0_0_15px_rgba(34,211,238,0.2)]' : 'bg-slate-900 text-slate-500 border-slate-800 hover:bg-slate-800 hover:text-slate-300'}`}
                        >
                            Game {game.number}
                        </button>
                    )
                })}
            </div>

            {/* Active Game Container */}
            <div className="flex flex-col gap-10">
                {/* VOD Iframe */}
                {activeGame.vodParameter ? (
                    <div className="w-full aspect-video rounded-3xl overflow-hidden border border-slate-800 shadow-2xl bg-black">
                        <iframe 
                            src={`https://www.youtube.com/embed/${activeGame.vodParameter}`} 
                            title={`Game ${activeGame.number} VOD`}
                            allowFullScreen
                            className="w-full h-full border-0"
                        />
                    </div>
                ) : (
                    <div className="w-full aspect-[21/9] rounded-3xl border border-slate-800 border-dashed flex flex-col items-center justify-center bg-slate-900/50">
                        <i className="fa fa-video-camera text-4xl text-slate-600 mb-4"></i>
                        <span className="text-slate-400 font-bold tracking-widest uppercase text-sm">VOD Not Available</span>
                    </div>
                )}

                {/* Simulated Post-Game Stats */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {renderTeamBoard(blueStats, true, team1)}
                    {renderTeamBoard(redStats, false, team2)}
                </div>
            </div>
        </div>
    );
}
