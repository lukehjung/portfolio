'use client';

import React, { useEffect, useState, useRef } from 'react';

interface TFTRankedStat {
  queueType: string;
  tier: string;
  rank: string;
  leaguePoints: number;
  wins: number;
  losses: number;
}

interface TFTUnit {
  character_id: string;
  tier: number;
  itemNames?: string[];
}

interface TFTTrait {
  name: string;
  tier_current: number;
}

interface TFTParticipant {
  puuid: string;
  placement: number;
  level: number;
  units: TFTUnit[];
  traits: TFTTrait[];
}

interface TFTMatch {
  metadata: { match_id: string };
  info: {
    game_datetime: number;
    participants: TFTParticipant[];
  };
}

interface TFTProfileData {
  account: { gameName: string; tagLine: string; puuid: string };
  summoner: { summonerLevel: number; profileIconId: number; id: string };
  ranked?: TFTRankedStat[];
  recentMatches: string[];
  matchHistory?: TFTMatch[];
}

export default function TFTStatsPage() {
  const [profiles, setProfiles] = useState<TFTProfileData[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [expandedProfiles, setExpandedProfiles] = useState<Record<string, boolean>>({});
  const initialized = useRef(false);

  async function fetchProfile(gameName: string, tagLine: string) {
    setLoading(true);
    setError(null);
    try {
      // Replace this URL with your deployed Cloudflare Worker proxy URL
      const response = await fetch(`https://tft-proxy.lukethejung.workers.dev/api/tft/profile/${gameName}/${tagLine}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
      }

      const json = await response.json();
      
      // Prevent adding the same person twice
      setProfiles(prev => {
        if (prev.find(p => p.account.puuid === json.account.puuid)) return prev;
        return [json, ...prev]; // Add new profiles to the top
      });
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An unexpected error occurred while fetching data.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Prevent React StrictMode from running this twice and hitting rate limits
    if (initialized.current) return;
    initialized.current = true;

    async function loadDefaultPlayers() {
      const defaultPlayers = [
        { name: 'Hyun', tag: 'JUNG' },
        { name: 'sugs', tag: '1111' },
        { name: 'yunjin', tag: 'downb' },
        { name: 'lenate', tag: 'na2' }
      ];

      for (const player of defaultPlayers) {
        await fetchProfile(player.name, player.tag);
        // Wait 1.5 seconds between each player to respect Riot's Rate Limits
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    }

    loadDefaultPlayers();
  }, []);

  const handleAddFriend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchInput.includes('#')) {
      setError('Please include the tag line using a "#" (e.g. Faker#NA1)');
      return;
    }
    const [name, tag] = searchInput.split('#');
    fetchProfile(name, tag);
    setSearchInput('');
  };

  const toggleExpand = (puuid: string) => {
    setExpandedProfiles(prev => ({ ...prev, [puuid]: !prev[puuid] }));
  };

  // Calculate aggregated stats for the comparison graph
  const comparisonStats = profiles.map(profile => {
    const matchHistory = profile.matchHistory || [];
    const myStatsList: TFTParticipant[] = [];
    matchHistory.forEach(match => {
      const p = match.info.participants.find(p => p.puuid === profile.account.puuid);
      if (p) myStatsList.push(p);
    });
    
    const placements = myStatsList.map(p => p.placement);
    const avgPlacement = placements.length ? (placements.reduce((a, b) => a + b, 0) / placements.length) : 0;
    const top4Count = placements.filter(p => p <= 4).length;
    const top4Rate = placements.length ? (top4Count / placements.length) * 100 : 0;

    // Extract Ranked Data
    const rankedList = Array.isArray(profile.ranked) ? profile.ranked : [];
    const rankedData = rankedList.find(r => r.queueType === 'RANKED_TFT') || null;

    // Weight tiers and ranks to calculate a sorting score
    const tierValues: Record<string, number> = {
      CHALLENGER: 90000, GRANDMASTER: 80000, MASTER: 70000,
      DIAMOND: 60000, EMERALD: 50000, PLATINUM: 40000,
      GOLD: 30000, SILVER: 20000, BRONZE: 10000, IRON: 0
    };
    const rankValues: Record<string, number> = { 'I': 3000, 'II': 2000, 'III': 1000, 'IV': 0 };

    let rankScore = -10000;
    let displayRank = 'Unranked';
    let displayLP = 0;

    if (rankedData) {
      rankScore = (tierValues[rankedData.tier] || 0) + (rankValues[rankedData.rank] || 0) + rankedData.leaguePoints;
      displayRank = ['CHALLENGER', 'GRANDMASTER', 'MASTER'].includes(rankedData.tier) ? rankedData.tier : `${rankedData.tier} ${rankedData.rank}`;
      displayLP = rankedData.leaguePoints;
    }

    return {
      name: profile.account.gameName,
      icon: profile.summoner.profileIconId,
      avgPlacement,
      top4Rate,
      games: placements.length,
      rankScore,
      displayRank,
      displayLP
    };
  }).filter(s => s.games > 0).sort((a, b) => b.rankScore - a.rankScore); // Sort by highest rank score

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <main className="max-w-[1600px] mx-auto bg-white text-gray-900 shadow-xl rounded-2xl overflow-hidden border border-gray-200 p-6 sm:p-10">
        
        {/* Header */}
        <div className="border-b border-gray-200 pb-6 mb-6 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 mb-2">
              TFT Meta Dashboard
            </h1>
            <p className="text-gray-500">Raw TFT player data and stats.</p>
          </div>
          <a href="/" className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors">
            &larr; Back to Portfolio
          </a>
        </div>

        {/* Content Area */}
        <div className="min-h-[400px]">
          
          {/* Search Bar */}
          <form onSubmit={handleAddFriend} className="mb-6 flex gap-4">
            <input
              type="text"
              placeholder="Add a friend (e.g. Doublelift#NA1)"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-gray-800"
            />
            <button
              type="submit"
              disabled={loading || !searchInput.trim()}
              className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-sm hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              <i className="fa fa-user-plus"></i> Add
            </button>
          </form>

          {loading && (
            <div className="flex items-center justify-center h-20 mb-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md mb-8">
              <p className="text-red-700 font-medium">Error loading TFT data:</p>
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {/* Comparison Graph */}
          {comparisonStats.length > 1 && (
            <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-gray-200 mb-8 overflow-hidden">
              <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-5 flex items-center gap-2">
                <i className="fa fa-bar-chart text-blue-500"></i> Performance Comparison
              </h2>
              
              <div className="overflow-x-auto">
                <div className="min-w-[700px] space-y-3">
                  <div className="grid grid-cols-12 gap-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 px-2">
                    <div className="col-span-3">Player</div>
                    <div className="col-span-3">Rank</div>
                    <div className="col-span-3">Average Placement</div>
                    <div className="col-span-3">Top 4 Rate</div>
                  </div>
                  
                  {comparisonStats.map((stat, idx) => (
                    <div key={stat.name} className="grid grid-cols-12 gap-4 items-center bg-gray-50 p-3 rounded-xl border border-gray-100 transition-colors hover:bg-gray-100">
                      <div className="col-span-3 flex items-center gap-3">
                        <span className="font-bold text-gray-400 w-4 text-sm">{idx + 1}.</span>
                        <img src={`https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/profile-icons/${stat.icon}.jpg`} onError={(e) => (e.currentTarget.src = "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/profile-icons/29.jpg")} className="w-8 h-8 rounded-full border border-gray-300 shadow-sm" alt="icon" />
                        <span className="font-bold text-gray-800 truncate text-sm">{stat.name}</span>
                      </div>
                      
                      <div className="col-span-3 flex flex-col justify-center">
                        <span className="font-extrabold text-gray-800 text-sm">{stat.displayRank}</span>
                        <span className="text-[10px] text-gray-500 font-semibold">{stat.displayLP} LP</span>
                      </div>

                      <div className="col-span-3 flex items-center gap-3 pr-4">
                        <span className="w-8 text-right font-extrabold text-blue-700 text-sm">{stat.avgPlacement.toFixed(2)}</span>
                        <div className="flex-1 bg-gray-200 h-2.5 rounded-full overflow-hidden flex shadow-inner">
                          {/* Scale: 1 is best (100% width), 8 is worst (0% width) */}
                          <div className="bg-gradient-to-r from-blue-400 to-blue-600 h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${((8 - stat.avgPlacement) / 7) * 100}%` }}></div>
                        </div>
                      </div>
                      
                      <div className="col-span-3 flex items-center gap-3 pr-4">
                        <span className="w-10 text-right font-extrabold text-green-600 text-sm">{stat.top4Rate.toFixed(0)}%</span>
                        <div className="flex-1 bg-gray-200 h-2.5 rounded-full overflow-hidden flex shadow-inner">
                          <div className="bg-gradient-to-r from-green-400 to-green-500 h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${stat.top4Rate}%` }}></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 xl:gap-10">
            {profiles.map((data, index) => {
              
              // Calculate Analytics for this specific profile
              const matchHistory = data.matchHistory || [];
              const myStatsList: TFTParticipant[] = [];
              
              matchHistory.forEach(match => {
                const p = match.info.participants.find(p => p.puuid === data.account.puuid);
                if (p) myStatsList.push(p);
              });

              const myPlacements = myStatsList.map(p => p.placement);
              const avgPlacement = myPlacements.length ? (myPlacements.reduce((a, b) => a + b, 0) / myPlacements.length).toFixed(2) : 'N/A';
              
              const sortedPlacements = [...myPlacements].sort((a, b) => a - b);
              const highPlacement = sortedPlacements[0] || 'N/A';
              const lowPlacement = sortedPlacements[sortedPlacements.length - 1] || 'N/A';
              
              const medianPlacement = myPlacements.length 
                ? (myPlacements.length % 2 === 0 
                    ? (sortedPlacements[myPlacements.length / 2 - 1] + sortedPlacements[myPlacements.length / 2]) / 2 
                    : sortedPlacements[Math.floor(myPlacements.length / 2)]) 
                : 'N/A';

              const traitCounts: Record<string, number> = {};
              myStatsList.forEach(p => {
                if (p.traits) {
                  p.traits.forEach(t => {
                    if (t.tier_current > 0) {
                      const cleanName = t.name.split('_').pop() || t.name;
                      traitCounts[cleanName] = (traitCounts[cleanName] || 0) + 1;
                    }
                  });
                }
              });

              const sortedTraits = Object.entries(traitCounts).sort((a, b) => b[1] - a[1]);
              const topTraitName = sortedTraits.length > 0 ? sortedTraits[0][0] : 'N/A';
              const topTraitCount = sortedTraits.length > 0 ? sortedTraits[0][1] : 0;

              return (
                <div key={data.account.puuid} className="bg-gray-50 border border-gray-200 p-6 rounded-2xl shadow-sm relative">
                  <button 
                    onClick={() => setProfiles(prev => prev.filter((_, i) => i !== index))}
                    className="absolute top-4 right-4 text-gray-400 hover:text-red-500 transition-colors"
                    title="Remove Profile"
                  >
                    <i className="fa fa-times text-xl"></i>
                  </button>
                  
                  {/* Profile Header Card */}
                  <div className="flex flex-col sm:flex-row items-center gap-6 mb-6">
                    <img 
                      src={`https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/profile-icons/${data.summoner.profileIconId}.jpg`} 
                      alt="Profile Icon"
                      className="w-20 h-20 rounded-full border-4 border-blue-500 shadow-sm object-cover bg-gray-100"
                      onError={(e) => (e.currentTarget.src = "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/profile-icons/29.jpg")}
                    />
                    <div className="text-center sm:text-left">
                      <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
                        {data.account.gameName} <span className="text-gray-400 font-medium text-lg">#{data.account.tagLine}</span>
                      </h2>
                      <p className="text-xs text-gray-500 font-medium uppercase tracking-widest mt-1">
                        Level {data.summoner.summonerLevel}
                      </p>
                    </div>
                  </div>

                  {/* Analytics Dashboard */}
                  {myPlacements.length > 0 && (
                    <div className="bg-white border border-blue-100 p-5 rounded-xl shadow-sm mb-6">
                      <h3 className="text-sm font-bold text-blue-900 uppercase mb-4 tracking-wider flex items-center gap-2">
                        <i className="fa fa-line-chart"></i> Recent Match Analytics ({myPlacements.length} Games)
                      </h3>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5 text-center">
                        <div className="bg-gray-50 py-3 px-2 rounded-lg border border-gray-100">
                          <p className="text-[10px] text-gray-500 font-bold uppercase mb-1">Avg Placement</p>
                          <p className="text-xl font-extrabold text-blue-700">{avgPlacement}</p>
                        </div>
                        <div className="bg-gray-50 py-3 px-2 rounded-lg border border-gray-100">
                          <p className="text-[10px] text-gray-500 font-bold uppercase mb-1">Median</p>
                          <p className="text-xl font-extrabold text-gray-900">{medianPlacement}</p>
                        </div>
                        <div className="bg-gray-50 py-3 px-2 rounded-lg border border-gray-100">
                          <p className="text-[10px] text-gray-500 font-bold uppercase mb-1">High / Low</p>
                          <p className="text-xl font-extrabold text-gray-900">{highPlacement} <span className="text-gray-300 mx-1">/</span> {lowPlacement}</p>
                        </div>
                        <div className="bg-gray-50 py-3 px-2 rounded-lg border border-gray-100">
                          <p className="text-[10px] text-gray-500 font-bold uppercase mb-1">Top Trait</p>
                          <p className="text-base font-extrabold text-indigo-700 leading-tight truncate px-2" title={topTraitName}>{topTraitName}</p>
                          <p className="text-[9px] text-gray-400 font-semibold uppercase mt-0.5">Played {topTraitCount}x</p>
                        </div>
                      </div>

                      <div>
                        <p className="text-[10px] text-gray-500 font-bold uppercase mb-2">Placements History</p>
                        <div className="flex flex-wrap gap-1.5">
                          {myPlacements.map((p, i) => (
                            <div key={i} className={`w-7 h-7 flex items-center justify-center rounded font-bold text-xs shadow-sm ${p <= 4 ? 'bg-blue-500 text-white' : 'bg-white text-gray-600 border border-gray-200'}`} title={`Match ${i + 1}: ${p}${p === 1 ? 'st' : p === 2 ? 'nd' : p === 3 ? 'rd' : 'th'} Place`}>
                              {p}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Match History Overview */}
                  <div className="bg-white border border-gray-200 p-5 rounded-xl shadow-sm">
                    <h3 className="text-sm font-bold text-gray-800 uppercase mb-4 tracking-wider flex items-center gap-2">
                      <i className="fa fa-history"></i> Recent Matches
                    </h3>
                    {data.matchHistory && data.matchHistory.length > 0 ? (
                      <div className="space-y-3">
                        {(expandedProfiles[data.account.puuid] ? data.matchHistory : data.matchHistory.slice(0, 3)).map((match) => {
                          const myStats = match.info.participants.find(p => p.puuid === data.account.puuid);
                          if (!myStats) return null;

                          const isTop4 = myStats.placement <= 4;
                          const cardColor = isTop4 ? "bg-blue-50/50 border-blue-100" : "bg-gray-50 border-gray-100";
                          const placeColor = isTop4 ? "text-blue-600" : "text-gray-500";

                          return (
                            <div key={match.metadata.match_id} className={`p-3 rounded-lg border flex flex-col sm:flex-row gap-4 items-start sm:items-center ${cardColor}`}>
                              <div className="flex-shrink-0 text-center w-12">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Place</p>
                                <p className={`text-2xl font-extrabold ${placeColor}`}>#{myStats.placement}</p>
                              </div>
                              <div className="flex-1">
                                <p className="text-xs font-bold text-gray-700 mb-2">
                                  Level {myStats.level} <span className="text-gray-400 font-normal mx-1">•</span> 
                                  <span className="text-gray-500 font-normal">{new Date(match.info.game_datetime).toLocaleDateString()}</span>
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {myStats.units.map((unit, idx) => {
                                    const cleanName = unit.character_id.split('_').pop();
                                    const borderColor = unit.tier === 3 ? 'border-yellow-400' : unit.tier === 2 ? 'border-gray-400' : 'border-amber-700';

                                    return (
                                      <div key={idx} className="flex flex-col items-center w-12 shrink-0 mt-1">
                                        <div className="relative">
                                          <img 
                                            src={`https://ddragon.leagueoflegends.com/cdn/14.8.1/img/champion/${cleanName}.png`}
                                            alt={cleanName}
                                            className={`w-10 h-10 rounded object-cover border-[1.5px] shadow-sm bg-gray-800 ${borderColor}`}
                                            onError={(e) => {
                                              e.currentTarget.src = "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/profile-icons/29.jpg";
                                            }}
                                          />
                                          <div className="absolute -bottom-2 w-full flex justify-center drop-shadow-[0_1px_1px_rgba(0,0,0,0.9)]">
                                            <span className="text-yellow-400 text-[10px] leading-none">{"★".repeat(unit.tier)}</span>
                                          </div>
                                        </div>

                                        {/* Item Icons */}
                                        {unit.itemNames && unit.itemNames.length > 0 && (
                                          <div className="flex mt-2 justify-center z-10 w-full">
                                            {unit.itemNames.map((itemName, i) => {
                                              // E.g., "TFT_Item_GuinsoosRageblade" -> "GuinsoosRageblade"
                                              const cleanItemName = itemName.split('_').pop() || 'Item';
                                              return (
                                                <img 
                                                  key={i}
                                                  src={`https://rerollcdn.com/items/${cleanItemName}.png`}
                                                  alt={cleanItemName}
                                                  title={cleanItemName}
                                                  className="w-4 h-4 rounded-[2px] border border-gray-900 shadow-sm -ml-1.5 flex-shrink-0 first:ml-0 bg-gray-800 object-cover"
                                                  onError={(e) => {
                                                    // Transparent pixel fallback to show the bg-gray-800 box
                                                    e.currentTarget.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
                                                  }}
                                                />
                                              );
                                            })}
                                          </div>
                                        )}
                                        
                                        <span className="text-[9px] text-gray-600 mt-1 truncate w-full text-center font-medium">
                                          {cleanName}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        {data.matchHistory.length > 3 && (
                          <button 
                            onClick={() => toggleExpand(data.account.puuid)}
                            className="w-full mt-2 py-2 text-sm text-blue-600 font-semibold bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-100"
                          >
                            {expandedProfiles[data.account.puuid] ? 'Show Less' : `Show ${data.matchHistory.length - 3} More Matches`}
                          </button>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No recent matches found.</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}