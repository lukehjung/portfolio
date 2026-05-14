'use client';

import React, { useEffect, useState, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { sampleData } from './sampleData';

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
  rarity?: number;
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
  const [activityBucket, setActivityBucket] = useState<'day' | 'week' | 'month'>('day');
  const [isSquad, setIsSquad] = useState(false);
  const [mounted, setMounted] = useState(false);
  const initialized = useRef(false);

  async function fetchProfile(gameName: string, tagLine: string, forceRefresh = false) {
    setLoading(true);
    setError(null);
    try {
      let response;
      try {
        const fetchUrl = `https://tft-proxy.lukethejung.workers.dev/api/tft/profile/${gameName}/${tagLine}${forceRefresh ? '?refresh=true' : ''}`;
        response = await fetch(fetchUrl);
      } catch (networkErr: any) {
        response = { ok: false, status: 0, statusText: networkErr.message || 'Network error' };
      }

      if (!response.ok) {
        const fallbackKey = `${gameName}#${tagLine}`;
        if (fallbackKey in sampleData) {
          setError(`Warning: Your Riot API Key is likely invalid or down (${response.status}). Using offline sample data for ${fallbackKey}!`);
          const fallbackProfile = (sampleData as any)[fallbackKey];
          setProfiles(prev => {
            const existingIndex = prev.findIndex(p => p.account.puuid === fallbackProfile.account.puuid);
            if (existingIndex >= 0) {
              const newProfiles = [...prev];
              newProfiles[existingIndex] = fallbackProfile;
              return newProfiles;
            }
            return [fallbackProfile, ...prev];
          });
          return;
        }

        let errorMessage = `Failed to fetch: ${response.status} ${response.statusText}`;
        if (response.status === 401 || response.status === 403) {
          errorMessage = 'Invalid Riot API key or unauthorized. Please check the API key in your proxy.';
        } else if (response.status === 404) {
          errorMessage = 'Player not found. Please check the Riot ID and tag line.';
        } else if (response.status === 429) {
          errorMessage = 'Riot API rate limit exceeded. Please try again in a few moments.';
        }
        throw new Error(errorMessage);
      }

      const json = await response.json();

      if (json.isStale) {
        setError(`Warning: Riot API is currently unavailable. Displaying the last known cached data for ${gameName}#${tagLine}.`);
      }

      // Update profile or add new to the top
      setProfiles(prev => {
        const existingIndex = prev.findIndex(p => p.account.puuid === json.account.puuid);
        if (existingIndex >= 0) {
          const newProfiles = [...prev];
          newProfiles[existingIndex] = json;
          return newProfiles;
        }
        return [json, ...prev];
      });
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An unexpected error occurred while fetching data.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setMounted(true);
    // Prevent React StrictMode from running this twice and hitting rate limits
    if (initialized.current) return;
    initialized.current = true;

    const squadMode = typeof window !== 'undefined' && window.location.search.includes('squad=all');
    setIsSquad(squadMode);

    async function loadDefaultPlayers() {
      const defaultPlayers = squadMode ? [
        { name: 'Hyun', tag: 'JUNG' },
        { name: 'yunjin', tag: 'downb' },
        { name: 'lenate', tag: 'na2' }
      ] : [
        { name: 'Hyun', tag: 'JUNG' }
      ];

      for (const player of defaultPlayers) {
        await fetchProfile(player.name, player.tag);
        // Wait 1.5 seconds between each player to respect Riot's Rate Limits
        if (squadMode) await new Promise(resolve => setTimeout(resolve, 1500));
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
    const allMatchHistory = profile.matchHistory || [];
    const currentSetCoreName = allMatchHistory[0]?.info?.tft_set_core_name;
    const matchHistory = currentSetCoreName 
      ? allMatchHistory.filter(m => m.info?.tft_set_core_name === currentSetCoreName)
      : allMatchHistory;

    const myStatsList: TFTParticipant[] = [];
    matchHistory.forEach(match => {
      const p = match.info?.participants?.find(p => p.puuid === profile.account.puuid);
      if (p) myStatsList.push(p);
    });

    const placements = myStatsList.map(p => p.placement);
    const avgPlacement = placements.length ? (placements.reduce((a, b) => a + b, 0) / placements.length) : 0;
    const top4Count = placements.filter(p => p <= 4).length;
    let top4Rate = placements.length ? (top4Count / placements.length) * 100 : 0;
    let totalGames = placements.length;

    // Win rate (1st places in recent matches)
    const winCount = placements.filter(p => p === 1).length;
    const winRate = placements.length ? (winCount / placements.length) * 100 : 0;

    // Playstyle (based on recent matches)
    const currentSetPrefix = myStatsList.length > 0 && myStatsList[0].traits?.length > 0 
      ? myStatsList[0].traits.find(t => t.name.includes('_'))?.name.split('_')[0] 
      : null;

    const traitCounts: Record<string, number> = {};
    const ignoreTerms = ['Trait', 'Tank', 'Unique', 'Boss', 'Undetermined', 'Teamup'];
    const nameMap: Record<string, string> = { 
      'DRX': 'N.O.V.A.', 
      'SummonTrait': 'Shepherd',
      'Astronaut': 'Meeple',
      'PsyOps': 'Psionic',
      'ADMIN': 'Arbiter',
      'AnimaSquad': 'Anima'
    };
    myStatsList.forEach(p => {
      if (p.traits) {
        p.traits.forEach(t => {
          if (t.tier_current > 0) {
            if (currentSetPrefix && !t.name.startsWith(currentSetPrefix)) return;
            let cleanName = t.name.includes('_') ? t.name.substring(t.name.indexOf('_') + 1) : t.name;
            if (cleanName.startsWith('Stargazer_')) cleanName = 'Stargazer';
            cleanName = nameMap[cleanName] || cleanName;
            if (ignoreTerms.some(term => cleanName.includes(term))) return;
            traitCounts[cleanName] = (traitCounts[cleanName] || 0) + 1;
          }
        });
      }
    });

    const sortedTraits = Object.entries(traitCounts).sort((a, b) => b[1] - a[1]);
    const topTraitCount = sortedTraits.length > 0 ? sortedTraits[0][1] : 0;
    const traitForcedRatio = placements.length > 0 ? (topTraitCount / placements.length) : 0;
    
    let playstyle = "Mystery";
    if (placements.length > 0) {
      if (traitForcedRatio >= 0.7) playstyle = "Hard Forcer 🤖";
      else if (traitForcedRatio >= 0.5) playstyle = "Two-Trick 🎭";
      else if (traitForcedRatio <= 0.3) playstyle = "Mr. Flexible 🤸‍♂️";
      else playstyle = "Average Joe 🤷‍♂️";
    }

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
      // Override recent match games/top4 rate with true seasonal ranked data
      totalGames = rankedData.wins + rankedData.losses;
      top4Rate = totalGames > 0 ? (rankedData.wins / totalGames) * 100 : 0;
    }

    return {
      name: profile.account.gameName,
      icon: profile.summoner.profileIconId,
      avgPlacement,
      top4Rate,
      winRate,
      playstyle,
      games: totalGames,
      rankScore,
      displayRank,
      displayLP
    };
  }).filter(s => s.games > 0).sort((a, b) => b.rankScore - a.rankScore); // Sort by highest rank score

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <main className="max-w-[1600px] mx-auto bg-white text-gray-900 shadow-xl rounded-2xl overflow-hidden border border-gray-200 p-6 sm:p-10">

        {/* Header */}
        <div className="border-b border-gray-200 pb-6 mb-6 flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
          <div>
            <div className="flex items-center gap-4 mb-2">
              <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">
                TFT Meta Dashboard
              </h1>
              {mounted && (
                <button
                  onClick={() => window.location.href = isSquad ? "/tft" : "/tft?squad=all"}
                  className="text-xs px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-full hover:bg-indigo-100 border border-indigo-100 transition-all font-bold flex items-center shadow-sm whitespace-nowrap"
                >
                  {isSquad ? "View Solo (Hyun)" : "Compare Squad (3)"}
                </button>
              )}
            </div>
            <p className="text-gray-500">Raw TFT player data and stats.</p>
          </div>
          <a href="/" className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors whitespace-nowrap mb-1">
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
            <div className={`border-l-4 p-4 rounded-md mb-8 ${error.startsWith('Warning:') ? 'bg-amber-50 border-amber-500' : 'bg-red-50 border-red-500'}`}>
              <p className={`font-medium ${error.startsWith('Warning:') ? 'text-amber-800' : 'text-red-700'}`}>
                {error.startsWith('Warning:') ? 'Limited Connectivity:' : 'Error loading TFT data:'}
              </p>
              <p className={`text-sm ${error.startsWith('Warning:') ? 'text-amber-700 font-bold' : 'text-red-600'}`}>{error}</p>
            </div>
          )}

          {/* Comparison Graph */}
          {comparisonStats.length > 1 && (
            <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-gray-200 mb-8 overflow-hidden">
              <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-5 flex items-center gap-2">
                <i className="fa fa-bar-chart text-blue-500"></i> Performance Comparison
              </h2>

              <div className="overflow-x-auto">
                <div className="min-w-[950px] space-y-3">
                  <div className="grid grid-cols-12 gap-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 px-2">
                    <div className="col-span-3">Player</div>
                    <div className="col-span-2">Rank</div>
                    <div className="col-span-2">Avg Place</div>
                    <div className="col-span-2">Win Rate</div>
                    <div className="col-span-2">Top 4 Rate</div>
                    <div className="col-span-1 text-center">Games</div>
                  </div>

                  {comparisonStats.map((stat, idx) => (
                    <div key={stat.name} className="grid grid-cols-12 gap-4 items-center bg-gray-50 p-3 rounded-xl border border-gray-100 transition-colors hover:bg-gray-100">
                      <div className="col-span-3 flex items-center gap-3">
                        <span className="font-bold text-gray-400 w-4 text-sm shrink-0">{idx + 1}.</span>
                        <img src={`https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/profile-icons/${stat.icon}.jpg`} onError={(e) => (e.currentTarget.src = "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/profile-icons/29.jpg")} className="w-8 h-8 rounded-full border border-gray-300 shadow-sm shrink-0" alt="icon" />
                        <div className="flex flex-col min-w-0">
                          <span className="font-bold text-gray-800 truncate text-sm">{stat.name}</span>
                          <span className="text-[10px] text-indigo-500 font-bold truncate" title={stat.playstyle}>{stat.playstyle}</span>
                        </div>
                      </div>

                      <div className="col-span-2 flex flex-col justify-center">
                        <span className="font-extrabold text-gray-800 text-sm">{stat.displayRank}</span>
                        <span className="text-[10px] text-gray-500 font-semibold">{stat.displayLP} LP</span>
                      </div>

                      <div className="col-span-2 flex items-center gap-3 pr-2">
                        <span className="w-8 text-right font-extrabold text-blue-700 text-sm">{stat.avgPlacement.toFixed(2)}</span>
                        <div className="flex-1 bg-gray-200 h-2.5 rounded-full overflow-hidden flex shadow-inner">
                          {/* Scale: 1 is best (100% width), 8 is worst (0% width) */}
                          <div className="bg-gradient-to-r from-blue-400 to-blue-600 h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${((8 - stat.avgPlacement) / 7) * 100}%` }}></div>
                        </div>
                      </div>

                      <div className="col-span-2 flex items-center gap-3 pr-2">
                        <span className="w-8 text-right font-extrabold text-yellow-600 text-sm">{stat.winRate.toFixed(0)}%</span>
                        <div className="flex-1 bg-gray-200 h-2.5 rounded-full overflow-hidden flex shadow-inner">
                          <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${stat.winRate}%` }}></div>
                        </div>
                      </div>

                      <div className="col-span-2 flex items-center gap-3 pr-2">
                        <span className="w-8 text-right font-extrabold text-green-600 text-sm">{stat.top4Rate.toFixed(0)}%</span>
                        <div className="flex-1 bg-gray-200 h-2.5 rounded-full overflow-hidden flex shadow-inner">
                          <div className="bg-gradient-to-r from-green-400 to-green-500 h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${stat.top4Rate}%` }}></div>
                        </div>
                      </div>

                      <div className="col-span-1 flex items-center justify-center">
                        <span className="font-extrabold text-gray-600 text-sm">{stat.games}</span>
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
              const allMatchHistory = data.matchHistory || [];
              const currentSetCoreName = allMatchHistory[0]?.info?.tft_set_core_name;
              const matchHistory = currentSetCoreName 
                ? allMatchHistory.filter(m => m.info?.tft_set_core_name === currentSetCoreName)
                : allMatchHistory;

              const myStatsList: TFTParticipant[] = [];

              matchHistory.forEach(match => {
                const p = match.info?.participants?.find(p => p.puuid === data.account.puuid);
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

              const currentSetPrefix = myStatsList.length > 0 && myStatsList[0].traits?.length > 0 
                ? myStatsList[0].traits.find(t => t.name.includes('_'))?.name.split('_')[0] 
                : null;

              const traitCounts: Record<string, number> = {};
              const ignoreTerms = ['Trait', 'Tank', 'Unique', 'Boss', 'Undetermined', 'Teamup'];
              const nameMap: Record<string, string> = { 
                'DRX': 'N.O.V.A.', 
                'SummonTrait': 'Shepherd',
                'Astronaut': 'Meeple',
                'PsyOps': 'Psionic',
                'ADMIN': 'Arbiter',
                'AnimaSquad': 'Anima'
              };
              myStatsList.forEach(p => {
                if (p.traits) {
                  p.traits.forEach(t => {
                    if (t.tier_current > 0) {
                      if (currentSetPrefix && !t.name.startsWith(currentSetPrefix)) return;
                      let cleanName = t.name.includes('_') ? t.name.substring(t.name.indexOf('_') + 1) : t.name;
                      if (cleanName.startsWith('Stargazer_')) cleanName = 'Stargazer';
                      cleanName = nameMap[cleanName] || cleanName;
                      if (ignoreTerms.some(term => cleanName.includes(term))) return;
                      traitCounts[cleanName] = (traitCounts[cleanName] || 0) + 1;
                    }
                  });
                }
              });

              const sortedTraits = Object.entries(traitCounts).sort((a, b) => b[1] - a[1]);
              const topTraits = sortedTraits.slice(0, 3);

              let oneCost3Stars = 0;
              let twoCost3Stars = 0;
              let threeCost3Stars = 0;
              let fourCost3Stars = 0;
              let fiveCost3Stars = 0;

              myStatsList.forEach(p => {
                if (p.units) {
                  p.units.forEach(u => {
                    if (u.tier === 3) {
                      if (u.rarity === 0) oneCost3Stars++;
                      else if (u.rarity === 1) twoCost3Stars++;
                      else if (u.rarity === 2) threeCost3Stars++;
                      else if (u.rarity === 4) fourCost3Stars++;
                      else if (u.rarity === 6) fiveCost3Stars++;
                    }
                  });
                }
              });

              const rankedList = Array.isArray(data.ranked) ? data.ranked : [];
              const rankedData = rankedList.find(r => r.queueType === 'RANKED_TFT') || null;
              const trueTotalGames = rankedData ? (rankedData.wins + rankedData.losses) : myPlacements.length;

              // Activity Graph Data (games per day over the available match history)
              const activityMap: Record<string, number> = {};
              matchHistory.forEach(match => {
                const dateObj = new Date(match.info.game_datetime);
                let dateStr = '';
                if (activityBucket === 'day') {
                  dateStr = `${dateObj.getMonth() + 1}/${dateObj.getDate()}`;
                } else if (activityBucket === 'month') {
                  dateStr = dateObj.toLocaleString('default', { month: 'short' });
                } else {
                  const d = new Date(dateObj);
                  const day = d.getDay();
                  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
                  d.setDate(diff);
                  dateStr = `Wk of ${d.getMonth() + 1}/${d.getDate()}`;
                }
                activityMap[dateStr] = (activityMap[dateStr] || 0) + 1;
              });

              const activityData = Object.keys(activityMap).map(dateStr => {
                return { date: dateStr, games: activityMap[dateStr] };
              }).sort((a, b) => {
                if (activityBucket === 'month') {
                  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                  return months.indexOf(a.date) - months.indexOf(b.date);
                }
                if (activityBucket === 'week') {
                  const [m1, d1] = a.date.replace('Wk of ', '').split('/').map(Number);
                  const [m2, d2] = b.date.replace('Wk of ', '').split('/').map(Number);
                  return (m1 - m2) || (d1 - d2);
                }
                const [m1, d1] = a.date.split('/').map(Number);
                const [m2, d2] = b.date.split('/').map(Number);
                return (m1 - m2) || (d1 - d2);
              });

              // Placement Frequency Graph Data
              const placementMap: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0 };
              myPlacements.forEach(p => {
                if (p >= 1 && p <= 8) placementMap[p]++;
              });
              const placementData = Object.keys(placementMap).map(p => ({
                placement: `${p}${p === '1' ? 'st' : p === '2' ? 'nd' : p === '3' ? 'rd' : 'th'}`,
                count: placementMap[Number(p)],
                originalPlacement: Number(p)
              }));

              return (
                <div key={data.account.puuid} className="bg-gray-50 border border-gray-200 p-6 rounded-2xl shadow-sm relative">
                  <div className="absolute top-4 right-4 flex gap-3">
                    <button
                      onClick={() => fetchProfile(data.account.gameName, data.account.tagLine, true)}
                      className="text-gray-400 hover:text-blue-500 transition-colors"
                      title="Force Refresh Data"
                    >
                      <i className={`fa fa-refresh text-xl ${loading ? 'animate-spin cursor-not-allowed' : ''}`}></i>
                    </button>
                    <button
                      onClick={() => setProfiles(prev => prev.filter((_, i) => i !== index))}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                      title="Remove Profile"
                    >
                      <i className="fa fa-times text-xl"></i>
                    </button>
                  </div>

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
                        <i className="fa fa-line-chart"></i> Recent Match Analytics ({myPlacements.length} Games Analyzed)
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
                          <p className="text-[10px] text-gray-500 font-bold uppercase mb-1">Season Games</p>
                          <p className="text-xl font-extrabold text-gray-900">{trueTotalGames}</p>
                        </div>
                        <div className="bg-gray-50 py-2 px-2 rounded-lg border border-gray-100 flex flex-col justify-center">
                          <p className="text-[10px] text-gray-500 font-bold uppercase mb-1">Top Traits</p>
                          <div className="flex flex-col gap-0.5 text-left w-full px-1">
                            {topTraits.length > 0 ? topTraits.map(([name, count], i) => (
                              <div key={i} className="flex justify-between items-center w-full">
                                <span className="text-xs font-extrabold text-indigo-700 truncate mr-2" title={name}>{name}</span>
                                <span className="text-[9px] text-gray-400 font-bold shrink-0">{count}x</span>
                              </div>
                            )) : (
                              <span className="text-xs font-extrabold text-gray-400 text-center w-full">N/A</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {activityData.length > 0 && (
                        <div className="mt-5 border-t border-gray-100 pt-5">
                          <p className="text-[10px] text-gray-500 font-bold uppercase mb-3 flex justify-between items-center">
                            <span>Games Played Activity (Last {matchHistory.length} Matches)</span>
                            <div className="flex bg-gray-200 rounded-md p-0.5">
                              <button onClick={() => setActivityBucket('day')} className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all ${activityBucket === 'day' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}>DAY</button>
                              <button onClick={() => setActivityBucket('week')} className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all ${activityBucket === 'week' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}>WEEK</button>
                              <button onClick={() => setActivityBucket('month')} className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all ${activityBucket === 'month' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}>MONTH</button>
                            </div>
                          </p>
                          <div className="h-40 w-full bg-gray-50 rounded-xl border border-gray-100 p-2 sm:p-4">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={activityData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af', fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#9ca3af', fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                                <Tooltip 
                                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', fontSize: '12px', fontWeight: 'bold' }} 
                                  itemStyle={{ color: '#4f46e5' }}
                                  labelStyle={{ color: '#6b7280', marginBottom: '4px' }}
                                />
                                <Line type="monotone" dataKey="games" name="Games Played" stroke="#4f46e5" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 6, strokeWidth: 0, fill: '#4f46e5' }} />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      )}

                      <div className="mt-5 border-t border-gray-100 pt-5">
                        <p className="text-[10px] text-gray-500 font-bold uppercase mb-3">3-Star Milestones (Recent Matches)</p>
                        <div className="flex flex-wrap gap-3">
                          <div className="flex-1 min-w-[60px] bg-gray-50 py-3 rounded-lg border border-gray-200 flex flex-col justify-center text-center transition-transform hover:scale-105">
                            <p className="text-2xl font-black text-gray-500 drop-shadow-sm">{oneCost3Stars}</p>
                            <p className="text-[10px] text-gray-500 font-extrabold uppercase mt-1 tracking-wider">1-Cost 3★</p>
                          </div>
                          <div className="flex-1 min-w-[60px] bg-emerald-50 py-3 rounded-lg border border-emerald-100 flex flex-col justify-center text-center transition-transform hover:scale-105">
                            <p className="text-2xl font-black text-emerald-600 drop-shadow-sm">{twoCost3Stars}</p>
                            <p className="text-[10px] text-emerald-800 font-extrabold uppercase mt-1 tracking-wider">2-Cost 3★</p>
                          </div>
                          <div className="flex-1 min-w-[60px] bg-blue-50 py-3 rounded-lg border border-blue-100 flex flex-col justify-center text-center transition-transform hover:scale-105">
                            <p className="text-2xl font-black text-blue-600 drop-shadow-sm">{threeCost3Stars}</p>
                            <p className="text-[10px] text-blue-800 font-extrabold uppercase mt-1 tracking-wider">3-Cost 3★</p>
                          </div>
                          <div className="flex-1 min-w-[60px] bg-purple-50 py-3 rounded-lg border border-purple-100 flex flex-col justify-center text-center transition-transform hover:scale-105">
                            <p className="text-2xl font-black text-purple-600 drop-shadow-sm">{fourCost3Stars}</p>
                            <p className="text-[10px] text-purple-800 font-extrabold uppercase mt-1 tracking-wider">4-Cost 3★</p>
                          </div>
                          {fiveCost3Stars > 0 && (
                            <div className="flex-1 min-w-[60px] bg-yellow-50 py-3 rounded-lg border border-yellow-200 shadow-inner flex flex-col justify-center text-center transition-transform hover:scale-105">
                              <p className="text-2xl font-black text-yellow-600 drop-shadow-md">{fiveCost3Stars}</p>
                              <p className="text-[10px] text-yellow-700 font-extrabold uppercase mt-1 tracking-wider">5-Cost 3★</p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mt-5 border-t border-gray-100 pt-5">
                        <div>
                          <p className="text-[10px] text-gray-500 font-bold uppercase mb-3 flex justify-between items-center">
                            <span>Placements History</span>
                          </p>
                          <div className="flex flex-wrap gap-1.5 bg-gray-50 rounded-xl border border-gray-100 p-4 min-h-[10rem] items-start content-start">
                            {myPlacements.slice(0, trueTotalGames).map((p, i) => (
                              <div key={i} className={`w-7 h-7 flex items-center justify-center rounded font-bold text-xs shadow-sm ${p === 1 ? 'bg-green-500 text-white border-green-600' : p <= 4 ? 'bg-blue-500 text-white border-blue-600' : p === 8 ? 'bg-red-500 text-white border-red-600' : 'bg-white text-gray-600 border border-gray-200'}`} title={`Match ${i + 1}: ${p}${p === 1 ? 'st' : p === 2 ? 'nd' : p === 3 ? 'rd' : 'th'} Place`}>
                                {p}
                              </div>
                            ))}
                          </div>
                        </div>

                        {myPlacements.length > 0 && (
                          <div>
                            <p className="text-[10px] text-gray-500 font-bold uppercase mb-3 flex justify-between items-center">
                              <span>Placement Frequency</span>
                            </p>
                            <div className="h-40 w-full bg-gray-50 rounded-xl border border-gray-100 p-2 sm:p-4">
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={placementData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                                  <XAxis dataKey="placement" tick={{ fontSize: 10, fill: '#9ca3af', fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#9ca3af', fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                                  <Tooltip 
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', fontSize: '12px', fontWeight: 'bold' }} 
                                    cursor={{fill: 'rgba(0,0,0,0.05)'}}
                                    formatter={(value: any) => [value, 'Times Placed']}
                                  />
                                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                                    {placementData.map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={entry.originalPlacement === 1 ? '#22c55e' : entry.originalPlacement <= 4 ? '#3b82f6' : entry.originalPlacement === 8 ? '#ef4444' : '#9ca3af'} />
                                    ))}
                                  </Bar>
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Match History Overview */}
                  <div className="bg-white border border-gray-200 p-5 rounded-xl shadow-sm">
                    <h3 className="text-sm font-bold text-gray-800 uppercase mb-4 tracking-wider flex items-center gap-2">
                      <i className="fa fa-history"></i> Recent Matches
                    </h3>
                    {matchHistory && matchHistory.length > 0 ? (
                      <div className="space-y-3">
                        {(expandedProfiles[data.account.puuid] ? matchHistory : matchHistory.slice(0, 5)).map((match) => {
                          const myStats = match.info?.participants?.find(p => p.puuid === data.account.puuid);
                          if (!myStats) return null;

                          const p = myStats.placement;
                          const cardColor = p === 1 ? "bg-green-50 border-green-200" : p <= 4 ? "bg-blue-50 border-blue-200" : p === 8 ? "bg-red-50 border-red-200" : "bg-gray-50 border-gray-200";
                          const placeColor = p === 1 ? "text-green-600" : p <= 4 ? "text-blue-600" : p === 8 ? "text-red-600" : "text-gray-500";

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
                                    let cleanName = unit.character_id.split('_').pop() || '';
                                    const originalName = cleanName;

                                    // Fix common naming discrepancies in DDragon.
                                    // We cannot just use .toLowerCase() and capitalize the first letter because
                                    // DDragon strictly enforces CamelCase for two-word names (e.g. MissFortune.png),
                                    // but explicitly drops internal capitals for apostrophe names (Cho'Gath -> Chogath.png).
                                    if (cleanName === 'Wukong') cleanName = 'MonkeyKing';
                                    if (cleanName === 'RenataGlasc') cleanName = 'Renata';
                                    if (cleanName === 'ChoGath') cleanName = 'Chogath';
                                    if (cleanName === 'KaiSa') cleanName = 'Kaisa';
                                    if (cleanName === 'KhaZix') cleanName = 'Khazix';
                                    if (cleanName === 'VelKoz') cleanName = 'Velkoz';
                                    if (cleanName === 'LeBlanc') cleanName = 'Leblanc';

                                    const setMatch = unit.character_id.match(/TFT(\d+)/);
                                    const setNum = setMatch ? setMatch[1] : '16';

                                    const borderColor = unit.tier === 3 ? 'border-yellow-400' : unit.tier === 2 ? 'border-gray-400' : 'border-amber-700';

                                    return (
                                      <div key={idx} className="flex flex-col items-center w-12 shrink-0 mt-1">
                                        <div className="relative">
                                          <img
                                            src={`https://ddragon.leagueoflegends.com/cdn/16.5.1/img/champion/${cleanName}.png`}
                                            alt={originalName}
                                            className={`w-10 h-10 rounded object-cover border-[1.5px] shadow-sm bg-gray-800 ${borderColor}`}
                                            onError={(e) => {
                                              const target = e.currentTarget;
                                              if (target.src.includes('ddragon')) {
                                                // Fallback for TFT unique characters (Kobuko, Loris, Atakhan, etc.)
                                                target.src = `https://ap.tft.tools/img/face/${unit.character_id.toLowerCase()}.jpg`;
                                              } else if (target.src.includes('tft.tools')) {
                                                target.src = "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/profile-icons/29.jpg";
                                              }
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
                                                  src={`https://ddragon.leagueoflegends.com/cdn/16.5.1/img/tft-item/${itemName}.png`}
                                                  alt={cleanItemName}
                                                  title={cleanItemName}
                                                  className="w-4 h-4 rounded-[2px] border border-gray-900 shadow-sm -ml-1.5 flex-shrink-0 first:ml-0 bg-gray-800 object-cover"
                                                  onError={(e) => {
                                                    const target = e.currentTarget;
                                                    if (target.src.includes('ddragon')) {
                                                      target.src = `https://rerollcdn.com/items/${cleanItemName}.png`;
                                                    } else if (target.src.includes('rerollcdn')) {
                                                      target.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
                                                    }
                                                  }}
                                                />
                                              );
                                            })}
                                          </div>
                                        )}

                                        <span className="text-[9px] text-gray-600 mt-1 truncate w-full text-center font-medium">
                                          {originalName}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        {matchHistory.length > 5 && (
                          <button
                            onClick={() => toggleExpand(data.account.puuid)}
                            className="w-full mt-2 py-2 text-sm text-blue-600 font-semibold bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-100"
                          >
                            {expandedProfiles[data.account.puuid] ? 'Show Less' : `Show All ${matchHistory.length} Matches`}
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