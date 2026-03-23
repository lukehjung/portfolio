import React from 'react';
import Link from 'next/link';
import { Team, Player } from '../api';

export const TeamCard = ({ team }: { team: Team }) => {
  return (
    <Link href={`/esports/team/${team.id}`} className="block group relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 shadow-xl transition-all duration-300 hover:shadow-cyan-500/20 hover:border-cyan-500/50 hover:-translate-y-1">
      {/* Decorative top glow */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-400 to-blue-600 opacity-50 group-hover:opacity-100 transition-opacity"></div>
      
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="relative w-16 h-16 rounded-xl bg-slate-800/80 p-2 flex items-center justify-center border border-slate-700 backdrop-blur-sm group-hover:border-cyan-500/30 transition-colors">
              <img src={team.image_url} alt={team.name} className="w-full object-contain filter drop-shadow-[0_0_8px_rgba(255,255,255,0.1)] group-hover:drop-shadow-[0_0_12px_rgba(34,211,238,0.3)] transition-all" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-white tracking-tight">{team.acronym}</h3>
              <p className="text-sm font-medium text-slate-400">{team.name}</p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-800 border border-slate-600 text-slate-300">
            {team.region}
          </span>
        </div>
        
        <div className="mt-6 flex justify-between items-center border-t border-slate-700/50 pt-4 group-hover:border-cyan-500/30 transition-colors">
          <span className="text-sm font-bold text-slate-400 uppercase tracking-widest group-hover:text-cyan-400 transition-colors flex items-center gap-2">
            View Details
          </span>
          <i className="fa fa-arrow-right text-slate-600 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all"></i>
        </div>
      </div>
    </Link>
  );
};

export const PlayerCard = ({ player, team }: { player: Player, team?: Team }) => {
  return (
    <Link href={`/esports/player/${player.id}`} className="block group relative overflow-hidden rounded-2xl bg-slate-900 border border-slate-700/50 shadow-xl transition-all duration-300 hover:shadow-purple-500/20 hover:border-purple-500/50 hover:-translate-y-1">
      {/* Background decoration */}
      <div className="absolute -right-12 -top-12 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl group-hover:bg-purple-500/20 transition-colors"></div>
      
      <div className="p-6 relative z-10">
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            <div className="w-16 h-16 xl:w-20 xl:h-20 rounded-full overflow-hidden border-2 border-slate-700 group-hover:border-purple-500/50 transition-colors bg-slate-800">
              <img src={player.image_url} alt={player.summoner_name} className="w-full h-full object-cover object-top filter grayscale group-hover:grayscale-0 transition-all duration-500" />
            </div>
            {team && (
              <div className="absolute -bottom-2 -right-2 w-6 h-6 xl:w-8 xl:h-8 rounded-full bg-slate-800 border-2 border-slate-900 p-0.5 flex items-center justify-center">
                <img src={team.image_url} alt={team.name} className="w-full object-contain" />
              </div>
            )}
          </div>
          
          <div className="min-w-0">
            <h3 className="text-xl xl:text-2xl font-black text-white tracking-tight truncate">{player.summoner_name}</h3>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className="px-2 py-0.5 rounded text-[10px] xl:text-xs font-bold uppercase tracking-wider bg-purple-500/10 text-purple-400 border border-purple-500/20 whitespace-nowrap">
                {player.role}
              </span>
              {team && (
                <span className="text-xs xl:text-sm font-medium text-slate-400 truncate">{team.name}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};
