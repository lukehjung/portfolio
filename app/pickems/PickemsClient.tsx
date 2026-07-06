'use client';

import React, { useState, useEffect, useMemo } from 'react';
import msiData from './msi_data.json';
import defaultParticipants from './participants.json';
import {
  Trophy,
  Flame,
  Calendar,
  RefreshCw,
  Info,
  Plus,
  Trash2,
  Edit,
  X,
  Award,
  User,
  Shield,
  Sword,
  Target,
  AlertCircle,
  ChevronDown,
  CheckCircle2,
  Users,
} from 'lucide-react';

import {
  CATEGORY_KEYS,
  CATEGORIES_INFO,
  TIERED_CATEGORIES,
  DONE_CATEGORIES,
  TIER_POINTS,
  MSI_PROXY_URL,
  PARTICIPANTS_URL,
} from './constants';

import {
  cleanName,
  isPickCorrect,
  getTierPointsForPick,
  getPickPlacementInfo,
  buildTierMap,
  getEntryValue,
} from './scoring';

const getChampionImage = (name: string, patchVersion = '15.1.1') => {
  if (!name || name === 'N/A' || name === 'Unknown') return '';
  let clean = name.replace(/[^a-zA-Z]/g, '');

  if (clean.toLowerCase() === 'wukong') clean = 'MonkeyKing';
  else if (clean.toLowerCase() === 'leblanc') clean = 'Leblanc';
  else if (clean.toLowerCase() === 'khazix') clean = 'Khazix';
  else if (clean.toLowerCase() === 'chogath') clean = 'Chogath';
  else if (clean.toLowerCase() === 'kaisa') clean = 'Kaisa';
  else if (clean.toLowerCase() === 'velkoz') clean = 'Velkoz';
  else if (clean.toLowerCase() === 'nunuwillump') clean = 'Nunu';

  return `https://ddragon.leagueoflegends.com/cdn/${patchVersion}/img/champion/${clean}.png`;
};

export default function PickemsPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [data, setData] = useState<any>(msiData);
  const [participants, setParticipants] = useState<any[]>(defaultParticipants as any);
  const [hydrated, setHydrated] = useState(false);
  const [viewOnly, setViewOnly] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const isPublic = params.get('viewonly') === 'true' || params.get('public') === 'true';
      if (isPublic) {
        setViewOnly(true);
        setActiveTab('dashboard');
      }
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch(MSI_PROXY_URL)
      .then((r) => (r.ok ? r.json() : null))
      .then((fresh) => {
        if (!cancelled && fresh && fresh.lastUpdated) setData(fresh);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [isAddingParticipant, setIsAddingParticipant] = useState(false);
  const [editingParticipantId, setEditingParticipantId] = useState<string | null>(null);
  const [expandedStandingIds, setExpandedStandingIds] = useState<Set<string>>(new Set());

  const toggleStanding = (id: string) => {
    setExpandedStandingIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const [champions, setChampions] = useState<string[]>([]);
  const [expandedMatchKey, setExpandedMatchKey] = useState<string | null>(null);
  const [selectedGameIdMap, setSelectedGameIdMap] = useState<{ [matchKey: string]: string }>({});
  
  const [isTriggeringScraper, setIsTriggeringScraper] = useState(false);
  const [scraperStatusMessage, setScraperStatusMessage] = useState<string | null>(null);
  const [isTokenModalOpen, setIsTokenModalOpen] = useState(false);
  const [tempToken, setTempToken] = useState('');

  const triggerScraper = async (pinToUse?: string, forceRestart = false) => {
    let pin = pinToUse || localStorage.getItem('admin_pin') || '';
    if (!pin) {
      setTempToken('');
      setIsTokenModalOpen(true);
      return;
    }

    // Cooldown check (5 minutes = 300,000 ms)
    if (!forceRestart) {
      const lastTrigger = localStorage.getItem('last_scrape_trigger_time');
      if (lastTrigger) {
        const diff = Date.now() - parseInt(lastTrigger, 10);
        const cooldownPeriod = 5 * 60 * 1000;
        if (diff < cooldownPeriod) {
          const remainingMin = Math.ceil((cooldownPeriod - diff) / 60000);
          const confirmForce = window.confirm(
            `A scrape was already triggered recently (${remainingMin}m remaining on cooldown).\n\nDo you want to force a restart anyway?`
          );
          if (!confirmForce) {
            return;
          }
        }
      }
    }

    setIsTriggeringScraper(true);
    setScraperStatusMessage('Triggering...');

    try {
      const url = 'https://msi-proxy.lukethejung.workers.dev/api/trigger-scrape';
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'x-admin-pin': pin
        }
      });

      const responseData = await res.json().catch(() => ({}));

      if (res.ok) {
        setScraperStatusMessage('Success! Workflow started.');
        localStorage.setItem('last_scrape_trigger_time', Date.now().toString());
        setTimeout(() => setScraperStatusMessage(null), 5000);
      } else {
        const errMsg = responseData.error || `Status ${res.status}`;
        if (res.status === 401) {
          localStorage.removeItem('admin_pin');
          setScraperStatusMessage('Invalid Passcode.');
        } else {
          setScraperStatusMessage(`Failed: ${errMsg}`);
        }
      }
    } catch (e: any) {
      console.error(e);
      setScraperStatusMessage(`Error: ${e.message || 'Unknown'}`);
    } finally {
      setIsTriggeringScraper(false);
    }
  };

  const handleTokenSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempToken.trim()) return;
    localStorage.setItem('admin_pin', tempToken.trim());
    setIsTokenModalOpen(false);
    triggerScraper(tempToken.trim());
  };

  const sortedGames = useMemo(() => {
    if (!data.games || !Array.isArray(data.games)) return [];
    return [...data.games].sort((a: any, b: any) => {
      const dateA = a.date || '';
      const dateB = b.date || '';
      if (dateA !== dateB) {
        return dateB.localeCompare(dateA);
      }
      return (b.gameId || '').localeCompare(a.gameId || '');
    });
  }, [data.games]);

  const groupedMatches = useMemo(() => {
    if (!data.games || !Array.isArray(data.games)) return [];
    const matchesMap: { [key: string]: any } = {};
    
    // Sort games by gameId ascending first
    const sortedGamesAsc = [...data.games].sort((a: any, b: any) => (a.gameId || '').localeCompare(b.gameId || ''));
    
    sortedGamesAsc.forEach((game: any) => {
      const teams = [game.blueTeam, game.redTeam].sort();
      const key = `${teams[0]}_vs_${teams[1]}_${game.stage}`;
      
      if (!matchesMap[key]) {
        matchesMap[key] = {
          key,
          team1: teams[0],
          team2: teams[1],
          stage: game.stage,
          date: game.date,
          games: [],
          wins: {
            [teams[0]]: 0,
            [teams[1]]: 0
          }
        };
      }
      
      matchesMap[key].games.push(game);
      if (game.winner) {
        matchesMap[key].wins[game.winner] = (matchesMap[key].wins[game.winner] || 0) + 1;
      }
      
      if (game.date > matchesMap[key].date) {
        matchesMap[key].date = game.date;
      }
    });
    
    return Object.values(matchesMap).sort((a: any, b: any) => {
      const dateA = a.date || '';
      const dateB = b.date || '';
      if (dateA !== dateB) {
        return dateB.localeCompare(dateA);
      }
      const lastGameA = a.games[a.games.length - 1]?.gameId || '';
      const lastGameB = b.games[b.games.length - 1]?.gameId || '';
      return lastGameB.localeCompare(lastGameA);
    });
  }, [data.games]);

  useEffect(() => {
    const patch = data.patchVersion || '15.1.1';
    fetch(`https://ddragon.leagueoflegends.com/cdn/${patch}/data/en_US/champion.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (!json?.data) return;
        const names = Object.values(json.data)
          .map((c: any) => c.name as string)
          .sort((a, b) => a.localeCompare(b));
        setChampions(names);
      })
      .catch(() => {});
  }, [data.patchVersion]);

  const dedupeByLower = (names: string[]) => {
    const seen = new Set<string>();
    const out: string[] = [];
    names.forEach((raw) => {
      const trimmed = (raw || '').trim();
      if (!trimmed) return;
      const key = trimmed.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      out.push(trimmed);
    });
    return out.sort((a, b) => a.localeCompare(b));
  };

  const teams = useMemo(() => {
    const collected: string[] = [...(data.msiTeams || [])];
    (data.games || []).forEach((g: any) => {
      if (g.blueTeam) collected.push(g.blueTeam);
      if (g.redTeam) collected.push(g.redTeam);
    });
    return dedupeByLower(collected);
  }, [data.msiTeams, data.games]);

  const players = useMemo(() => {
    const collected: string[] = [...(data.msiPlayers || [])];
    (data.games || []).forEach((g: any) => {
      (g.players || []).forEach((p: any) => {
        if (p.name) collected.push(p.name);
      });
    });
    return dedupeByLower(collected);
  }, [data.msiPlayers, data.games]);


  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerAvatar, setNewPlayerAvatar] = useState('👤');
  const [newPlayerPicks, setNewPlayerPicks] = useState<Record<string, string>>(
    CATEGORY_KEYS.reduce((acc, key) => ({ ...acc, [key]: '' }), {})
  );

  useEffect(() => {
    let cancelled = false;

    const fromLocal = () => {
      const saved = localStorage.getItem('pickems_participants');
      if (!saved) return null;
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    };

    fetch(PARTICIPANTS_URL)
      .then((r) => (r.ok ? r.json() : null))
      .then((remote) => {
        if (cancelled) return;
        if (Array.isArray(remote) && remote.length > 0) {
          setParticipants(remote);
        } else {
          const local = fromLocal();
          if (Array.isArray(local) && local.length > 0) setParticipants(local);
        }
      })
      .catch(() => {
        if (cancelled) return;
        const local = fromLocal();
        if (Array.isArray(local) && local.length > 0) setParticipants(local);
      })
      .finally(() => {
        if (!cancelled) setHydrated(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem('pickems_participants', JSON.stringify(participants));
    fetch(PARTICIPANTS_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(participants),
    }).catch(() => {});
  }, [participants, hydrated]);

  const getPlayerImage = (name: string) => {
    if (!name) return '';
    const clean = name.toLowerCase().trim();
    return data.playerImages?.[clean] || '';
  };

  const getTeamLogo = (name: string) => {
    if (!name) return '';
    const clean = name.toLowerCase().trim();
    return data.teamImages?.[clean] || '';
  };

  // Resolve the display name for a leaderboard entry, respecting the category's
  // expected type. Some entries carry both `player` and `champion` fields (e.g.
  // CS-in-single-game tracks pros, but includes which champion they played).
  // Without this, the fallback would show the champion instead of the pro.
  const resolveEntryName = (item: any, categoryKey: string | null): string => {
    if (!item) return 'Unknown';
    const type = categoryKey ? CATEGORIES_INFO[categoryKey]?.type : undefined;
    if (type === 'player' && item.player) return item.player;
    if (type === 'team' && item.team) return item.team;
    if (type === 'champion' && item.champion) return item.champion;
    return item.champion || item.player || item.team || item.gameId || 'Unknown';
  };

  const getModalChartData = () => {
    if (!activeCategory || !data.stats?.[activeCategory]) return [];

    const stat = data.stats[activeCategory];
    const leaderboard = stat.leaderboard || [];

    function getNumericValue(item: any, catKey: string) {
      if (catKey === 'category3') return 100 - (item.winrate * 100);
      if (catKey === 'category11') return 50 - item.kills;
      if (catKey === 'category9' && item.seconds !== undefined) return 3600 - item.seconds;
      if (item.count !== undefined) return item.count;
      if (item.winrate !== undefined) return item.winrate * 100;
      if (item.kda !== undefined) return item.kda;
      if (item.kills !== undefined) return item.kills;
      if (item.cs !== undefined) return item.cs;
      if (item.fbCount !== undefined) return item.fbCount;
      if (item.avgDmg !== undefined) return item.avgDmg;
      if (item.elderDragons !== undefined) return item.elderDragons;
      if (item.uniqueCount !== undefined) return item.uniqueCount;
      if (item.bans !== undefined) return item.bans;
      return 0;
    }

    function getDisplayValue(item: any) {
      if (item.count !== undefined) return `${item.count} picks`;
      if (item.winrate !== undefined) {
        const wrStr = `${(item.winrate * 100).toFixed(1)}% (${item.wins}/${item.picks})`;
        if (item.qualified === false) return `${wrStr} ⚠️`;
        return wrStr;
      }
      if (item.kdaFormatted !== undefined) return `${item.kdaFormatted} KDA (${item.kills}/${item.deaths}/${item.assists})`;
      if (item.kills !== undefined) return `${item.kills} kills`;
      if (item.cs !== undefined) return `${item.cs} CS`;
      if (item.fbCount !== undefined) return `${item.fbCount} FB`;
      if (item.avgDmg !== undefined) return `${item.avgDmg} DPM`;
      if (item.elderDragons !== undefined) return `${item.elderDragons} Elder Dragons`;
      if (item.uniqueCount !== undefined) return `${item.uniqueCount} pool`;
      if (item.bans !== undefined) return `${item.bans} bans`;
      if (item.duration !== undefined) return `${item.duration}`;
      return '';
    }

    const isTiered = TIERED_CATEGORIES.has(activeCategory);
    const tierMap = isTiered ? buildTierMap(leaderboard) : new Map<number, number>();
    const tierPointsFor = (item: any): number | undefined => {
      if (!isTiered) return undefined;
      const v = getEntryValue(item);
      if (v == null) return 0;
      const tier = tierMap.get(v);
      return tier == null ? 0 : TIER_POINTS[tier];
    };

    // For tiered categories, include every entry that lands in one of the top
    // 3 distinct-value tiers (so all tied champs show up as leaders). For
    // non-tiered categories, keep the classic "top 3 by index" behaviour.
    const winnerSlice: any[] = isTiered
      ? leaderboard.filter((item: any) => {
          const v = getEntryValue(item);
          return v != null && tierMap.has(v);
        })
      : leaderboard.slice(0, 3);

    const top3: any[] = winnerSlice.map((item: any, idx: number) => ({
      name: resolveEntryName(item, activeCategory),
      value: getNumericValue(item, activeCategory),
      displayVal: getDisplayValue(item),
      isTop3: true,
      rank: idx + 1,
      pickedBy: [],
      qualified: item.qualified,
      picks: item.picks,
      tierPts: tierPointsFor(item),
    }));

    participants.forEach((p) => {
      const rawPick = p.picks[activeCategory];
      if (!rawPick) return;

      const cleanPick = cleanName(rawPick);

      const existingIndex = top3.findIndex((t) => cleanName(t.name) === cleanPick);
      if (existingIndex !== -1) {
        top3[existingIndex].pickedBy.push(p);
      } else {
        const lbItem = leaderboard.find((item: any) => {
          const name = resolveEntryName(item, activeCategory);
          return cleanName(name) === cleanPick;
        });

        if (lbItem) {
          const addedIndex = top3.findIndex((t) => cleanName(t.name) === cleanPick);
          if (addedIndex !== -1) {
            top3[addedIndex].pickedBy.push(p);
          } else {
            const lbIndex = leaderboard.indexOf(lbItem);
            const lbTier = tierPointsFor(lbItem);
            top3.push({
              name: resolveEntryName(lbItem, activeCategory),
              value: getNumericValue(lbItem, activeCategory),
              displayVal: getDisplayValue(lbItem),
              isTop3: isTiered && !!lbTier,
              rank: lbIndex + 1,
              pickedBy: [p],
              qualified: lbItem.qualified,
              picks: lbItem.picks,
              tierPts: lbTier,
            });
          }
        } else {
          const addedIndex = top3.findIndex((t) => cleanName(t.name) === cleanPick);
          if (addedIndex !== -1) {
            top3[addedIndex].pickedBy.push(p);
          } else {
            let actualPicksCount = 0;
            if (data.games) {
              data.games.forEach((g: any) => {
                g.players.forEach((pl: any) => {
                  if (pl.champion.toLowerCase() === rawPick.toLowerCase()) {
                    actualPicksCount++;
                  }
                });
              });
            }

            const isWinrateCategory = activeCategory === 'category2' || activeCategory === 'category3';
            const displayVal = isWinrateCategory && actualPicksCount > 0
              ? `Unqualified (${actualPicksCount} gp)`
              : activeCategory === 'category15'
                ? (rawPick.toLowerCase() === 'no' ? 'No (0 picks)' : 'Yes (0 picks)')
                : '0';

            top3.push({
              name: rawPick,
              value: 0,
              displayVal,
              isTop3: false,
              pickedBy: [p],
            });
          }
        }
      }
    });

    return top3.sort((a, b) => {
      if (a.isTop3 && !b.isTop3) return -1;
      if (!a.isTop3 && b.isTop3) return 1;
      return b.value - a.value;
    });
  };

  const getParticipantBreakdown = (participant: any) => {
    const hits: { key: string; label: string; pick: string; pts: number }[] = [];
    if (!data.stats) return { score: 0, hits };
    let score = 0;
    CATEGORY_KEYS.forEach((key) => {
      const pick = participant.picks[key];
      if (!pick) return;
      const catStat = data.stats[key];
      const info = CATEGORIES_INFO[key];

      if (TIERED_CATEGORIES.has(key)) {
        const pts = getTierPointsForPick(key, pick, catStat?.leaderboard || []);
        if (pts > 0) {
          score += pts;
          hits.push({ key, label: info.label, pick, pts });
        }
        return;
      }

      const leader = catStat?.leader;
      if (isPickCorrect(key, pick, leader)) {
        score += info.pts;
        hits.push({ key, label: info.label, pick, pts: info.pts });
      }
    });
    return { score, hits };
  };

  const calculateParticipantScore = (participant: any) =>
    getParticipantBreakdown(participant).score;

  const getStandings = () =>
    participants
      .map((p) => {
        const { score, hits } = getParticipantBreakdown(p);
        return { ...p, score, hits };
      })
      .sort((a, b) => b.score - a.score);

  const handleAddParticipantSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlayerName.trim()) return;
    const newPlayer = {
      id: Date.now().toString(),
      name: newPlayerName.trim(),
      avatar: newPlayerAvatar,
      picks: newPlayerPicks,
    };
    setParticipants([...participants, newPlayer]);
    setNewPlayerName('');
    setNewPlayerAvatar('👤');
    setNewPlayerPicks(CATEGORY_KEYS.reduce((acc, key) => ({ ...acc, [key]: '' }), {}));
    setIsAddingParticipant(false);
  };

  const handleEditParticipantSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setParticipants(
      participants.map((p) =>
        p.id === editingParticipantId
          ? { ...p, name: newPlayerName.trim(), avatar: newPlayerAvatar, picks: newPlayerPicks }
          : p
      )
    );
    setNewPlayerName('');
    setNewPlayerAvatar('👤');
    setNewPlayerPicks(CATEGORY_KEYS.reduce((acc, key) => ({ ...acc, [key]: '' }), {}));
    setEditingParticipantId(null);
  };

  const startEdit = (player: any) => {
    setEditingParticipantId(player.id);
    setNewPlayerName(player.name);
    setNewPlayerAvatar(player.avatar || '👤');
    setNewPlayerPicks(player.picks);
  };

  const deleteParticipant = (id: string) => {
    if (window.confirm('Are you sure you want to remove this participant?')) {
      setParticipants(participants.filter((p) => p.id !== id));
    }
  };

  const standings = getStandings();

  return (
    <div className="pickems-page">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@400;600;700;800&display=swap');

        .pickems-page {
          --bg-primary: #0a0c10;
          --bg-secondary: #121620;
          --bg-tertiary: #1b2130;
          --bg-glass: rgba(18, 22, 32, 0.7);
          --border-color: rgba(255, 255, 255, 0.08);
          --border-glow: rgba(0, 246, 255, 0.2);
          --text-primary: #f0f3f8;
          --text-secondary: #a0aec0;
          --text-muted: #718096;
          --color-blue: #00f6ff;
          --color-gold: #ffc837;
          --color-red: #ff3366;
          --color-green: #00e676;
          --gradient-blue: linear-gradient(135deg, #00f6ff 0%, #0072ff 100%);
          --gradient-gold: linear-gradient(135deg, #ffc837 0%, #ff8008 100%);
          --gradient-red: linear-gradient(135deg, #ff3366 0%, #ba2649 100%);
          --gradient-dark: linear-gradient(180deg, #121620 0%, #0a0c10 100%);
          --gradient-card-hover: linear-gradient(135deg, rgba(0, 246, 255, 0.05) 0%, rgba(255, 200, 55, 0.02) 100%);
          --font-heading: 'Outfit', sans-serif;
          --font-body: 'Inter', sans-serif;
          --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.3);
          --shadow-md: 0 8px 24px rgba(0, 0, 0, 0.4);
          --shadow-lg: 0 16px 40px rgba(0, 0, 0, 0.6);
          --shadow-glow-blue: 0 0 15px rgba(0, 246, 255, 0.25);
          --shadow-glow-gold: 0 0 15px rgba(255, 200, 55, 0.25);

          background-color: var(--bg-primary);
          background-image:
            radial-gradient(circle at 10% 20%, rgba(0, 114, 255, 0.05) 0%, transparent 40%),
            radial-gradient(circle at 90% 80%, rgba(255, 128, 8, 0.03) 0%, transparent 40%);
          color: var(--text-primary);
          font-family: var(--font-body);
          -webkit-font-smoothing: antialiased;
          min-height: 100vh;
          overflow-x: hidden;
        }
        .pickems-page * { box-sizing: border-box; }
        .pickems-page button { font-family: inherit; }

        @keyframes pickems-pulseGlow {
          0%, 100% { box-shadow: 0 0 15px rgba(0, 246, 255, 0.15); border-color: rgba(0, 246, 255, 0.2); }
          50% { box-shadow: 0 0 25px rgba(0, 246, 255, 0.35); border-color: rgba(0, 246, 255, 0.4); }
        }
        @keyframes pickems-slideIn {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes pickems-fadeIn { from { opacity: 0; } to { opacity: 1; } }

        .pickems-page .glass {
          background: var(--bg-glass);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid var(--border-color);
        }
        .pickems-page .gradient-text-blue {
          background: var(--gradient-blue);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .pickems-page .gradient-text-gold {
          background: var(--gradient-gold);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .pickems-page .app-container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 2rem;
          animation: pickems-fadeIn 0.8s ease-out;
        }
        .pickems-page header {
          margin-bottom: 2.5rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 1.5rem;
        }
        .pickems-page .brand { display: flex; flex-direction: column; }
        .pickems-page .brand h1 {
          font-family: var(--font-heading);
          font-size: 2.5rem;
          font-weight: 800;
          letter-spacing: -0.5px;
          line-height: 1.1;
          text-transform: uppercase;
        }
        .pickems-page .brand p { color: var(--text-secondary); font-size: 0.95rem; margin-top: 0.25rem; }

        .pickems-page .tabs {
          display: flex;
          background: rgba(18, 22, 32, 0.5);
          border: 1px solid var(--border-color);
          padding: 0.35rem;
          border-radius: 12px;
          gap: 0.25rem;
        }
        .pickems-page .tab-btn {
          background: transparent;
          border: none;
          color: var(--text-secondary);
          font-family: var(--font-heading);
          font-size: 1rem;
          font-weight: 600;
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .pickems-page .tab-btn:hover { color: var(--text-primary); background: rgba(255, 255, 255, 0.03); }
        .pickems-page .tab-btn.active { background: var(--gradient-blue); color: #05050a; box-shadow: var(--shadow-glow-blue); }

        .pickems-page .cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 1.5rem;
          margin-bottom: 3rem;
        }
        .pickems-page .pickem-card {
          border-radius: 16px;
          padding: 1.5rem;
          position: relative;
          overflow: hidden;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
          display: flex;
          flex-direction: column;
          height: 380px;
          box-shadow: var(--shadow-sm);
        }
        .pickems-page .pickem-card::before {
          content: '';
          position: absolute; top: 0; left: 0; width: 100%; height: 100%;
          background: var(--gradient-card-hover);
          opacity: 0; transition: opacity 0.4s ease; z-index: 0;
        }
        .pickems-page .pickem-card:hover {
          transform: translateY(-8px) scale(1.01);
          border-color: rgba(0, 246, 255, 0.3);
          box-shadow: var(--shadow-md), 0 0 20px rgba(0, 246, 255, 0.05);
        }
        .pickems-page .pickem-card:hover::before { opacity: 1; }

        .pickems-page .card-header { display: flex; justify-content: space-between; align-items: center; z-index: 1; margin-bottom: 1.25rem; }
        .pickems-page .points-badge {
          font-family: var(--font-heading); font-size: 0.8rem; font-weight: 700;
          background: rgba(255, 200, 55, 0.1); border: 1px solid rgba(255, 200, 55, 0.3);
          color: var(--color-gold); padding: 0.3rem 0.6rem; border-radius: 6px;
        }
        .pickems-page .category-icon { color: var(--text-muted); }
        .pickems-page .card-media {
          height: 140px; background: var(--bg-tertiary); border-radius: 12px; margin-bottom: 1rem;
          overflow: hidden; z-index: 1; position: relative;
          display: flex; align-items: center; justify-content: center;
          border: 1px solid rgba(255, 255, 255, 0.03);
        }
        .pickems-page .card-media img { width: 100%; height: 100%; object-fit: cover; object-position: top; transition: transform 0.6s ease; }
        .pickems-page .pickem-card:hover .card-media img { transform: scale(1.1); }
        .pickems-page .media-placeholder { font-size: 3rem; opacity: 0.75; }
        .pickems-page .leader-name-overlay {
          position: absolute; bottom: 0; left: 0; width: 100%;
          background: linear-gradient(180deg, transparent 0%, rgba(10, 12, 16, 0.95) 100%);
          padding: 2.5rem 1rem 0.5rem; text-align: center;
          font-family: var(--font-heading); font-weight: 700; font-size: 1.15rem;
          color: var(--text-primary); letter-spacing: 0.5px;
        }
        .pickems-page .card-content { z-index: 1; display: flex; flex-direction: column; flex-grow: 1; }
        .pickems-page .card-title {
          font-family: var(--font-heading); font-size: 0.95rem; font-weight: 600;
          color: var(--text-secondary); line-height: 1.4; margin-bottom: 0.75rem; flex-grow: 1;
        }
        .pickems-page .card-footer {
          display: flex; justify-content: space-between; align-items: flex-end;
          border-top: 1px solid rgba(255, 255, 255, 0.05); padding-top: 0.75rem; margin-top: auto;
        }
        .pickems-page .leader-label { font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; }
        .pickems-page .leader-value { font-family: var(--font-heading); font-size: 1.1rem; font-weight: 700; color: var(--color-blue); margin-top: 0.15rem; }
        .pickems-page .details-indicator { color: var(--text-muted); font-size: 0.8rem; display: flex; align-items: center; gap: 0.25rem; transition: color 0.2s ease; }
        .pickems-page .pickem-card:hover .details-indicator { color: var(--color-blue); }

        .pickems-page .pickem-card.done {
          border-color: rgba(34, 197, 94, 0.4);
          box-shadow: var(--shadow-sm), 0 0 12px rgba(34, 197, 94, 0.12);
        }
        .pickems-page .pickem-card.done:hover {
          border-color: rgba(34, 197, 94, 0.65);
          box-shadow: var(--shadow-md), 0 0 20px rgba(34, 197, 94, 0.2);
        }
        .pickems-page .done-badge {
          display: inline-flex; align-items: center; gap: 0.3rem;
          font-family: var(--font-heading); font-size: 0.72rem; font-weight: 700;
          background: rgba(34, 197, 94, 0.12); border: 1px solid rgba(34, 197, 94, 0.4);
          color: #22c55e; padding: 0.25rem 0.5rem; border-radius: 6px;
          text-transform: uppercase; letter-spacing: 0.5px;
        }
        .pickems-page .card-header-left { display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap; }

        .pickems-page .leaderboard-container { display: grid; grid-template-columns: 1fr 2.5fr; gap: 2rem; align-items: start; }
        @media (max-width: 968px) { .pickems-page .leaderboard-container { grid-template-columns: 1fr; } }
        .pickems-page .standings-panel { border-radius: 16px; padding: 1.5rem; box-shadow: var(--shadow-md); }
        .pickems-page .standings-panel h2 { font-family: var(--font-heading); font-size: 1.5rem; margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.5rem; }
        .pickems-page .standings-list { display: flex; flex-direction: column; gap: 0.75rem; }
        .pickems-page .standing-item {
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.04);
          transition: background 0.2s ease, border-color 0.2s ease;
          overflow: hidden;
        }
        .pickems-page .standing-item:hover { background: rgba(255, 255, 255, 0.04); border-color: rgba(0, 246, 255, 0.15); }
        .pickems-page .standing-item.expanded { border-color: rgba(0, 246, 255, 0.25); background: rgba(255, 255, 255, 0.035); }
        .pickems-page .standing-row {
          display: flex; align-items: center;
          padding: 1rem;
          cursor: pointer;
          outline: none;
          user-select: none;
        }
        .pickems-page .standing-row:focus-visible { box-shadow: inset 0 0 0 2px rgba(0, 246, 255, 0.35); border-radius: 12px; }
        .pickems-page .standing-breakdown {
          border-top: 1px dashed rgba(255, 255, 255, 0.06);
          padding: 0.75rem 1rem 1rem;
          background: rgba(0, 0, 0, 0.15);
        }
        .pickems-page .breakdown-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.35rem; }
        .pickems-page .breakdown-item {
          display: flex; align-items: baseline; gap: 0.5rem;
          font-size: 0.85rem;
          min-width: 0;
        }
        .pickems-page .breakdown-label { color: var(--text-secondary); flex-shrink: 0; }
        .pickems-page .breakdown-pick {
          color: var(--text-primary); font-weight: 500;
          flex: 1; min-width: 0;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .pickems-page .breakdown-pts {
          font-family: var(--font-heading); font-weight: 700;
          color: var(--color-gold);
          flex-shrink: 0;
        }
        .pickems-page .breakdown-empty { color: var(--text-muted); font-size: 0.85rem; font-style: italic; margin: 0; }
        .pickems-page .standing-rank { font-family: var(--font-heading); font-size: 1.25rem; font-weight: 800; width: 32px; color: var(--text-muted); }
        .pickems-page .standing-rank-1 { color: var(--color-gold); text-shadow: var(--shadow-glow-gold); }
        .pickems-page .standing-rank-2 { color: #d1d5db; }
        .pickems-page .standing-rank-3 { color: #b45309; }
        .pickems-page .standing-avatar { font-size: 1.5rem; margin-right: 0.75rem; }
        .pickems-page .standing-info { display: flex; flex-direction: column; flex-grow: 1; }
        .pickems-page .standing-name { font-weight: 600; font-size: 1rem; }
        .pickems-page .standing-score { font-family: var(--font-heading); font-size: 1.25rem; font-weight: 700; color: var(--color-blue); }
        .pickems-page .standing-pts { font-size: 0.75rem; color: var(--text-muted); margin-left: 0.2rem; }

        .pickems-page .comparison-panel { border-radius: 16px; padding: 1.5rem; box-shadow: var(--shadow-md); min-height: 500px; }
        .pickems-page .panel-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; flex-wrap: wrap; gap: 1rem; }
        .pickems-page .panel-title { display: flex; align-items: center; gap: 0.5rem; }
        .pickems-page .panel-title h2 { font-family: var(--font-heading); font-size: 1.5rem; }

        .pickems-page .btn {
          background: var(--gradient-blue); color: #05050a; border: none;
          font-family: var(--font-heading); font-weight: 700;
          padding: 0.6rem 1.2rem; border-radius: 8px; cursor: pointer;
          transition: all 0.3s ease; display: flex; align-items: center; gap: 0.5rem;
          box-shadow: var(--shadow-glow-blue);
        }
        .pickems-page .btn:hover { transform: translateY(-2px); box-shadow: 0 0 20px rgba(0, 246, 255, 0.4); }
        .pickems-page .btn-secondary { background: transparent; color: var(--text-primary); border: 1px solid var(--border-color); box-shadow: none; }
        .pickems-page .btn-secondary:hover { background: rgba(255, 255, 255, 0.05); border-color: var(--text-secondary); box-shadow: none; }

        .pickems-page .comparison-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 1rem; }
        .pickems-page .compare-card {
          border-radius: 12px; padding: 1.25rem;
          background: rgba(255, 255, 255, 0.01); border: 1px solid rgba(255, 255, 255, 0.04);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); cursor: pointer;
          min-width: 0;
        }
        .pickems-page .compare-card:hover { background: rgba(255, 255, 255, 0.02); border-color: rgba(0, 246, 255, 0.25); box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25); transform: translateY(-2px); }
        .pickems-page .compare-card-title { font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.75rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 500; }
        .pickems-page .compare-pick-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; font-size: 0.9rem; }
        .pickems-page .compare-player-label { color: var(--text-muted); }
        .pickems-page .compare-pick-val { font-family: var(--font-heading); font-weight: 700; }
        .pickems-page .compare-pick-correct { color: var(--color-green); }
        .pickems-page .compare-pick-tier-0 { color: var(--color-green); }
        .pickems-page .compare-pick-tier-1 { color: #66bb6a; }
        .pickems-page .compare-pick-tier-2 { color: #a5d6a7; }
        .pickems-page .compare-pick-incorrect { color: var(--color-red); }
        .pickems-page .compare-result-row { border-top: 1px dashed rgba(255, 255, 255, 0.05); padding-top: 0.5rem; margin-top: 0.5rem; display: flex; justify-content: space-between; font-size: 0.85rem; }
        .pickems-page .compare-result-leader { color: var(--color-blue); font-weight: 600; }
        .pickems-page .compare-card.done {
          border-color: rgba(34, 197, 94, 0.4);
          box-shadow: 0 0 10px rgba(34, 197, 94, 0.1);
        }
        .pickems-page .compare-card.done:hover {
          border-color: rgba(34, 197, 94, 0.65);
          box-shadow: 0 4px 20px rgba(34, 197, 94, 0.18);
        }
        .pickems-page .compare-card-header {
          display: flex; align-items: center; justify-content: space-between; gap: 0.5rem;
          margin-bottom: 0.75rem;
        }
        .pickems-page .compare-card-header .compare-card-title { margin-bottom: 0; min-width: 0; flex: 1; }
        .pickems-page .compare-done-icon { color: #22c55e; flex-shrink: 0; }

        .pickems-page .range-picks-list { display: flex; flex-direction: column; gap: 0.5rem; }
        .pickems-page .range-pick-row {
          display: flex; justify-content: space-between; align-items: center;
          padding: 0.75rem 1rem; border-radius: 10px;
          background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.04);
        }
        .pickems-page .range-pick-row.range-pick-correct {
          background: rgba(34, 197, 94, 0.06);
          border-color: rgba(34, 197, 94, 0.3);
        }
        .pickems-page .range-pick-participant { display: flex; align-items: center; gap: 0.6rem; font-weight: 600; }
        .pickems-page .range-pick-avatar { font-size: 1.15rem; }
        .pickems-page .range-pick-value {
          display: inline-flex; align-items: center; gap: 0.4rem;
          font-family: var(--font-heading); font-weight: 700; font-size: 0.95rem;
        }
        .pickems-page .range-pick-status.is-correct { color: #22c55e; }
        .pickems-page .range-pick-status.is-incorrect { color: var(--color-red); }

        .pickems-page .modal-overlay {
          position: fixed; top: 0; left: 0; width: 100%; height: 100%;
          background: rgba(5, 5, 10, 0.8); backdrop-filter: blur(8px);
          display: flex; align-items: center; justify-content: center;
          z-index: 100; padding: 1.5rem; animation: pickems-fadeIn 0.3s ease;
        }
        .pickems-page .modal-content {
          width: 100%; max-width: 600px; border-radius: 20px;
          box-shadow: var(--shadow-lg), 0 0 30px rgba(0, 246, 255, 0.08);
          overflow: hidden; animation: pickems-slideIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          display: flex; flex-direction: column; max-height: 90vh;
        }
        .pickems-page .modal-header { padding: 1.5rem; border-bottom: 1px solid rgba(255, 255, 255, 0.05); display: flex; justify-content: space-between; align-items: flex-start; }
        .pickems-page .modal-header h2 { font-family: var(--font-heading); font-size: 1.4rem; font-weight: 700; }
        .pickems-page .modal-header p { color: var(--text-secondary); font-size: 0.9rem; margin-top: 0.25rem; }
        .pickems-page .close-btn { background: transparent; border: none; color: var(--text-secondary); cursor: pointer; padding: 0.25rem; border-radius: 6px; display: flex; align-items: center; justify-content: center; transition: all 0.2s ease; }
        .pickems-page .close-btn:hover { background: rgba(255, 255, 255, 0.05); color: var(--text-primary); }
        .pickems-page .modal-body { padding: 1.5rem; overflow-y: auto; flex-grow: 1; }

        .pickems-page .modal-summary-box {
          background: rgba(0, 246, 255, 0.04); border: 1px solid rgba(0, 246, 255, 0.15);
          border-radius: 12px; padding: 1rem 1.25rem; margin-bottom: 1.5rem;
          display: flex; justify-content: space-between; align-items: center;
        }
        .pickems-page .modal-summary-label { font-size: 0.8rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; }
        .pickems-page .modal-summary-val { font-family: var(--font-heading); font-size: 1.25rem; font-weight: 800; color: var(--color-blue); text-shadow: 0 0 10px rgba(0, 246, 255, 0.2); }

        .pickems-page .leaderboard-table { width: 100%; border-collapse: collapse; }
        .pickems-page .leaderboard-table th { text-align: left; padding: 0.75rem 1rem; font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid rgba(255, 255, 255, 0.05); }
        .pickems-page .leaderboard-table td { padding: 0.85rem 1rem; font-size: 0.95rem; border-bottom: 1px solid rgba(255, 255, 255, 0.03); }
        .pickems-page .leaderboard-table tr:hover td { background: rgba(255, 255, 255, 0.01); }
        .pickems-page .leaderboard-table tr.leader-row td { background: rgba(0, 246, 255, 0.02); color: var(--color-blue); font-weight: 600; }
        .pickems-page .row-rank { font-family: var(--font-heading); font-weight: 700; width: 40px; }
        .pickems-page .row-val { font-family: var(--font-heading); font-weight: 700; text-align: right; }

        .pickems-page .editor-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; margin-top: 1.5rem; }
        @media (max-width: 576px) { .pickems-page .editor-grid { grid-template-columns: 1fr; } }
        .pickems-page .form-group { display: flex; flex-direction: column; gap: 0.5rem; }
        .pickems-page .form-group label { font-size: 0.85rem; color: var(--text-secondary); font-weight: 500; }
        .pickems-page .form-control {
          background: var(--bg-tertiary); border: 1px solid var(--border-color);
          color: var(--text-primary); padding: 0.6rem 0.85rem; border-radius: 8px;
          font-family: inherit; font-size: 0.95rem; outline: none;
          transition: border-color 0.2s ease; width: 100%;
        }
        .pickems-page .form-control:focus { border-color: var(--color-blue); }

        .pickems-page .matches-list { display: flex; flex-direction: column; gap: 1.25rem; }
        .pickems-page .match-card {
          border-radius: 16px; padding: 1.5rem; box-shadow: var(--shadow-sm);
          display: flex; flex-direction: column; gap: 1rem;
          transition: all 0.2s ease;
          cursor: pointer;
        }
        .pickems-page .match-card.expanded {
          border-color: rgba(0, 246, 255, 0.25);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.35);
        }
        .pickems-page .match-card-main {
          display: flex; justify-content: space-between; align-items: center; gap: 1.5rem; width: 100%;
        }
        .pickems-page .match-players-expanded {
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          padding-top: 1.25rem;
          margin-top: 0.5rem;
          width: 100%;
          cursor: default;
        }
        .pickems-page .game-tabs {
          display: flex; gap: 0.5rem; margin-bottom: 1.25rem; border-bottom: 1px solid rgba(255, 255, 255, 0.08); padding-bottom: 0.75rem; flex-wrap: wrap;
        }
        .pickems-page .game-tab-btn {
          background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); color: var(--text-secondary);
          padding: 0.4rem 1.25rem; border-radius: 8px; font-size: 0.85rem; font-weight: 500; cursor: pointer; transition: all 0.2s ease;
        }
        .pickems-page .game-tab-btn:hover {
          background: rgba(255, 255, 255, 0.08); border-color: rgba(255, 255, 255, 0.2); color: var(--text-primary);
        }
        .pickems-page .game-tab-btn.active {
          background: rgba(0, 246, 255, 0.1); border-color: var(--color-blue); color: var(--color-blue); font-weight: 600;
          box-shadow: 0 0 10px rgba(0, 246, 255, 0.15);
        }
        .pickems-page .match-players-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
        }
        @media (max-width: 992px) {
          .pickems-page .match-players-grid {
            grid-template-columns: 1fr;
          }
        }
        .pickems-page .stats-table-wrapper {
          overflow-x: auto;
          background: rgba(0, 0, 0, 0.2);
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.03);
        }
        .pickems-page .player-stats-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.85rem;
          text-align: left;
        }
        .pickems-page .player-stats-table th {
          background: rgba(255, 255, 255, 0.02);
          padding: 0.5rem 0.75rem;
          color: var(--text-secondary);
          font-weight: 500;
          font-size: 0.75rem;
          text-transform: uppercase;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }
        .pickems-page .player-stats-table td {
          padding: 0.5rem 0.75rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.03);
          vertical-align: middle;
        }
        .pickems-page .player-name-bold {
          font-weight: 600;
          color: var(--text-primary);
        }
        .pickems-page .player-role-small {
          font-size: 0.7rem;
          color: var(--text-muted);
        }
        .pickems-page .stat-champ-img {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          object-fit: cover;
        }
        .pickems-page .winner-badge {
          background: rgba(0, 230, 118, 0.15);
          color: #00e676;
          padding: 0.1rem 0.35rem;
          font-size: 0.65rem;
          border-radius: 3px;
          font-weight: bold;
          letter-spacing: 0.5px;
        }
        .pickems-page .match-card:hover { border-color: rgba(255, 255, 255, 0.12); transform: scale(1.002); }
        .pickems-page .match-meta { display: flex; flex-direction: column; gap: 0.25rem; }
        .pickems-page .match-stage {
          font-size: 0.75rem; background: rgba(0, 246, 255, 0.08); border: 1px solid rgba(0, 246, 255, 0.15);
          color: var(--color-blue); padding: 0.2rem 0.5rem; border-radius: 4px; align-self: flex-start;
          font-family: var(--font-heading); font-weight: 600; text-transform: uppercase;
        }
        .pickems-page .match-date { font-size: 0.85rem; color: var(--text-muted); }
        .pickems-page .gol-link {
          font-size: 0.8rem;
          color: var(--color-blue);
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 0.2rem;
          margin-top: 0.25rem;
          opacity: 0.7;
          transition: opacity 0.2s ease;
        }
        .pickems-page .gol-link:hover {
          opacity: 1;
          text-decoration: underline;
        }
        .pickems-page .match-teams-score { display: flex; align-items: center; gap: 2rem; flex-grow: 1; justify-content: center; }
        .pickems-page .match-team {
          display: flex; flex-direction: row; align-items: center;
          gap: 0.5rem; width: 220px;
        }
        .pickems-page .match-team-blue { justify-content: flex-end; }
        .pickems-page .match-team-red { justify-content: flex-start; }
        .pickems-page .match-team-logo { width: 28px; height: 28px; object-fit: contain; flex-shrink: 0; }
        .pickems-page .match-team-name { font-family: var(--font-heading); font-size: 1.2rem; font-weight: 700; }
        .pickems-page .match-stats { text-align: right; min-width: 150px; }
        .pickems-page .match-stats p { font-size: 0.85rem; margin: 0; }
        .pickems-page .match-stat-label { color: var(--text-muted); }
        .pickems-page .match-stat-fb { color: var(--color-gold); font-weight: 600; }
        .pickems-page .match-team.winner .match-team-name { color: var(--color-blue); }
        .pickems-page .match-team.loser { opacity: 0.6; }
        .pickems-page .match-score-bubble {
          background: var(--bg-tertiary); border: 1px solid var(--border-color);
          padding: 0.5rem 1.5rem; border-radius: 30px;
          font-family: var(--font-heading); font-size: 1.5rem; font-weight: 800; letter-spacing: 2px;
        }

        @media (max-width: 992px) {
          .pickems-page .match-card-main {
            flex-direction: column;
            align-items: stretch;
            gap: 0.75rem;
          }
          .pickems-page .match-card-main .match-meta { flex-direction: row; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
          .pickems-page .match-teams-score { gap: 0.5rem; }
          .pickems-page .match-team { width: auto; flex: 1; min-width: 0; }
          .pickems-page .match-team-name { font-size: 0.9rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
          .pickems-page .match-score-bubble { padding: 0.4rem 0.85rem; font-size: 1.15rem; letter-spacing: 1px; }
          .pickems-page .match-stats { text-align: left; min-width: 0; display: flex; gap: 0.75rem; flex-wrap: wrap; }
          .pickems-page .match-stats p { font-size: 0.8rem; }
        }

        .pickems-page .footer-bar {
          margin-top: 5rem; border-top: 1px solid var(--border-color); padding: 2rem 0;
          display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap;
          gap: 1.5rem; color: var(--text-muted); font-size: 0.85rem;
        }
        .pickems-page .refresh-panel {
          display: flex; align-items: center; gap: 0.75rem;
          background: rgba(255, 255, 255, 0.02); border: 1px dashed rgba(255, 255, 255, 0.1);
          padding: 0.75rem 1.25rem; border-radius: 12px;
        }
        .pickems-page .refresh-panel svg { color: var(--color-blue); }
        .pickems-page .refresh-panel svg.spin {
          animation: pickems-spin 1s linear infinite;
        }
        @keyframes pickems-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .pickems-page .refresh-text p:first-child { color: var(--text-secondary); font-weight: 500; font-size: 0.9rem; }
        .pickems-page .refresh-text p:last-child { font-size: 0.75rem; }

        .pickems-page .champion-avatar-glow {
          width: 80px; height: 80px; border-radius: 50%; overflow: hidden;
          border: 2px solid var(--color-blue); box-shadow: var(--shadow-glow-blue);
          background: var(--bg-primary);
          display: flex; align-items: center; justify-content: center;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .pickems-page .pickem-card:hover .champion-avatar-glow { transform: scale(1.08) rotate(3deg); border-color: var(--color-gold); box-shadow: var(--shadow-glow-gold); }
        .pickems-page .champion-avatar-glow img { width: 100%; height: 100%; object-fit: cover; }

        .pickems-page .chart-container {
          display: flex; flex-direction: column; gap: 1.25rem; margin-top: 0.5rem;
          background: rgba(255, 255, 255, 0.015); border: 1px solid var(--border-color);
          padding: 1.5rem; border-radius: 14px;
        }
        .pickems-page .chart-row { display: flex; flex-direction: column; gap: 0.45rem; }
        .pickems-page .chart-row-header { display: flex; justify-content: space-between; align-items: center; font-size: 0.95rem; }
        .pickems-page .chart-label-group { display: flex; align-items: center; gap: 0.6rem; min-width: 0; overflow: hidden; flex: 1; }
        .pickems-page .chart-item-name { font-weight: 600; font-family: var(--font-heading); letter-spacing: 0.3px; }
        .pickems-page .chart-item-badges { display: flex; gap: 0.35rem; }
        .pickems-page .chart-badge { font-size: 0.72rem; padding: 0.12rem 0.45rem; border-radius: 5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
        .pickems-page .chart-badge-leader { background: rgba(0, 246, 255, 0.08); border: 1px solid rgba(0, 246, 255, 0.25); color: var(--color-blue); box-shadow: 0 0 10px rgba(0, 246, 255, 0.05); }
        .pickems-page .chart-badge-pick { background: rgba(255, 200, 55, 0.08); border: 1px solid rgba(255, 200, 55, 0.25); color: var(--color-gold); box-shadow: 0 0 10px rgba(255, 200, 55, 0.05); }
        .pickems-page .chart-item-val { font-family: var(--font-heading); font-weight: 800; font-size: 0.85rem; flex-shrink: 0; white-space: nowrap; text-align: right; }
        .pickems-page .chart-bar-outer { background: var(--bg-tertiary); height: 28px; border-radius: 8px; overflow: hidden; position: relative; border: 1px solid rgba(255, 255, 255, 0.04); }
        .pickems-page .chart-bar-inner { height: 100%; border-radius: 7px 0 0 7px; transition: width 1s cubic-bezier(0.4, 0, 0.2, 1); }
        .pickems-page .chart-bar-blue { background: var(--gradient-blue); box-shadow: 0 0 12px rgba(0, 246, 255, 0.2); }
        .pickems-page .chart-bar-gold { background: var(--gradient-gold); box-shadow: 0 0 12px rgba(255, 200, 55, 0.25); }
        .pickems-page .chart-bar-participants {
          position: absolute; right: 0.5rem; top: 0; height: 100%;
          display: flex; align-items: center; gap: 0.35rem;
          pointer-events: none;
        }
        .pickems-page .chart-bar-participant {
          display: inline-flex; align-items: center; gap: 0.25rem;
          background: rgba(10, 12, 16, 0.7);
          border: 1px solid rgba(255, 255, 255, 0.12);
          padding: 0.1rem 0.5rem 0.1rem 0.35rem;
          border-radius: 999px;
          font-size: 0.75rem;
          line-height: 1;
          color: var(--text-primary);
          pointer-events: auto;
          cursor: help;
          backdrop-filter: blur(4px);
        }
        .pickems-page .chart-bar-participant-avatar { font-size: 0.9rem; line-height: 1; }
        .pickems-page .chart-bar-participant-name { font-weight: 600; letter-spacing: 0.2px; }

        /* ------------------------------------------------------------------ */
        /* Mobile overrides                                                    */
        /* ------------------------------------------------------------------ */
        @media (max-width: 640px) {
          .pickems-page .app-container { padding: 1rem; }

          .pickems-page header {
            margin-bottom: 1.25rem;
            gap: 1rem;
            align-items: stretch;
          }
          .pickems-page .brand h1 { font-size: 1.6rem; line-height: 1.15; }
          .pickems-page .brand p { font-size: 0.85rem; }

          .pickems-page .tabs {
            width: 100%;
            justify-content: stretch;
            padding: 0.25rem;
          }
          .pickems-page .tab-btn {
            flex: 1;
            min-width: 0;
            justify-content: center;
            padding: 0.65rem 0.5rem;
            font-size: 0.85rem;
            min-height: 44px;
          }

          .pickems-page .cards-grid {
            grid-template-columns: 1fr;
            gap: 1rem;
            margin-bottom: 1.5rem;
          }
          .pickems-page .pickem-card {
            height: auto;
            padding: 1.25rem;
          }
          .pickems-page .pickem-card:hover { transform: none; }
          .pickems-page .card-media { height: 120px; }
          .pickems-page .champion-avatar-glow { width: 64px; height: 64px; }
          .pickems-page .leader-name-overlay { font-size: 1rem; padding: 2rem 0.75rem 0.4rem; }

          .pickems-page .leaderboard-container { gap: 1rem; }
          .pickems-page .standings-panel,
          .pickems-page .comparison-panel { padding: 1rem; }
          .pickems-page .comparison-panel { min-height: 0; }
          .pickems-page .standings-panel h2,
          .pickems-page .panel-title h2 { font-size: 1.2rem; }

          .pickems-page .standing-item { min-width: 0; }
          .pickems-page .standing-row {
            padding: 0.65rem 0.75rem;
            gap: 0.5rem;
          }
          .pickems-page .standing-breakdown {
            padding: 0.65rem 0.75rem 0.85rem;
          }
          .pickems-page .breakdown-item { font-size: 0.78rem; gap: 0.35rem; flex-wrap: wrap; }
          .pickems-page .breakdown-pts { font-size: 0.85rem; }
          .pickems-page .standing-rank { font-size: 1rem; width: 26px; flex-shrink: 0; }
          .pickems-page .standing-avatar { font-size: 1.15rem; margin-right: 0.25rem; flex-shrink: 0; }
          .pickems-page .standing-info { min-width: 0; flex: 1; }
          .pickems-page .standing-name {
            font-size: 0.9rem;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            display: block;
          }
          .pickems-page .standing-score { font-size: 0.95rem; flex-shrink: 0; }
          .pickems-page .standing-pts { font-size: 0.65rem; }
          .pickems-page .standing-actions {
            display: flex;
            gap: 0.1rem;
            margin-left: 0.35rem !important;
            flex-shrink: 0;
          }
          .pickems-page .standing-actions button {
            min-width: 32px; min-height: 32px;
            padding: 0.2rem !important;
            display: inline-flex; align-items: center; justify-content: center;
          }

          .pickems-page .comparison-grid {
            grid-template-columns: 1fr;
            gap: 0.75rem;
          }
          .pickems-page .compare-card { padding: 0.85rem 0.9rem; }
          .pickems-page .compare-card-title {
            white-space: normal;
            font-size: 0.8rem;
            line-height: 1.3;
            margin-bottom: 0.6rem;
          }
          .pickems-page .compare-pick-row { font-size: 0.82rem; gap: 0.5rem; }
          .pickems-page .compare-player-label { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
          .pickems-page .compare-pick-val { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: right; }
          .pickems-page .compare-result-row { font-size: 0.78rem; flex-direction: column; align-items: flex-start; gap: 0.15rem; }
          .pickems-page .compare-result-leader { word-break: break-word; }

          .pickems-page .editor-grid { grid-template-columns: 1fr; gap: 1rem; }
          .pickems-page .modal-overlay { padding: 0; align-items: flex-end; }
          .pickems-page .modal-content {
            border-radius: 16px 16px 0 0;
            max-height: 95vh;
            max-width: 100%;
          }
          .pickems-page .modal-header { padding: 1rem; }
          .pickems-page .modal-header h2 { font-size: 1.1rem; }
          .pickems-page .modal-body { padding: 1rem; }
          .pickems-page .modal-summary-box {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.35rem;
            padding: 0.85rem 1rem;
          }
          .pickems-page .modal-summary-val { font-size: 1.1rem; word-break: break-word; }

          .pickems-page .chart-container { padding: 1rem; gap: 1rem; }
          .pickems-page .chart-row-header { flex-wrap: wrap; gap: 0.35rem; }
          .pickems-page .chart-item-val { font-size: 0.78rem; }
          .pickems-page .chart-bar-outer { height: 22px; }
          .pickems-page .chart-bar-participants { right: 0.35rem; gap: 0.25rem; }
          .pickems-page .chart-bar-participant { font-size: 0.65rem; padding: 0.08rem 0.4rem 0.08rem 0.3rem; gap: 0.2rem; }
          .pickems-page .chart-bar-participant-avatar { font-size: 0.75rem; }

          .pickems-page .leaderboard-table th,
          .pickems-page .leaderboard-table td { padding: 0.6rem 0.5rem; font-size: 0.85rem; }

          .pickems-page .match-card {
            padding: 1rem;
          }
          .pickems-page .match-card-main {
            flex-direction: column;
            align-items: stretch;
            gap: 0.75rem;
          }
          .pickems-page .match-card-main .match-meta { flex-direction: row; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
          .pickems-page .match-teams-score { gap: 0.5rem; }
          .pickems-page .match-team { width: auto; flex: 1; min-width: 0; }
          .pickems-page .match-team-name { font-size: 0.9rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
          .pickems-page .match-score-bubble { padding: 0.4rem 0.85rem; font-size: 1.15rem; letter-spacing: 1px; }
          .pickems-page .match-stats { text-align: left; min-width: 0; display: flex; gap: 0.75rem; flex-wrap: wrap; }
          .pickems-page .match-stats p { font-size: 0.8rem; }

          .pickems-page .footer-bar {
            margin-top: 2.5rem;
            flex-direction: column;
            align-items: flex-start;
            gap: 0.75rem;
            font-size: 0.8rem;
          }

          /* Tap targets */
          .pickems-page .btn,
          .pickems-page .close-btn {
            min-height: 44px;
            padding-inline: 1rem;
          }
          .pickems-page .close-btn { min-width: 44px; }
          .pickems-page .form-control { min-height: 44px; }
        }
      `}</style>

      <div className="app-container">
        <header>
          <div className="brand">
            <h1 className="gradient-text-blue">MSI 2026 Pick&apos;em Tracker</h1>
            <p>Real-time tournament tracking and leaderboards sourced from Games of Legends</p>
          </div>
          <div className="tabs">
            <button className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
              <Flame size={18} /> Dashboard
            </button>
            {!viewOnly && (
              <button className={`tab-btn ${activeTab === 'leaderboard' ? 'active' : ''}`} onClick={() => setActiveTab('leaderboard')}>
                <Trophy size={18} /> Standings
              </button>
            )}
            <button className={`tab-btn ${activeTab === 'matches' ? 'active' : ''}`} onClick={() => setActiveTab('matches')}>
              <Calendar size={18} /> Matches ({data.gamesCount || 0})
            </button>
          </div>
        </header>

        {activeTab === 'dashboard' && (
          <div>
            {!viewOnly ? (
              <div className="glass" style={{ borderRadius: '16px', padding: '1.25rem', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Award className="gradient-text-gold" size={24} />
                  <div>
                    <h4 style={{ fontWeight: 600 }}>Pick&apos;em Leaders</h4>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Current standings based on {data.gamesCount} games played</p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                  {standings.slice(0, 3).map((player, index) => (
                    <div key={player.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '1.25rem' }}>
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                      </span>
                      <span style={{ fontWeight: 600 }}>{player.name}</span>
                      <span style={{ color: 'var(--color-blue)', fontFamily: 'var(--font-heading)', fontWeight: 700 }}>
                        {player.score} pts
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="glass" style={{ borderRadius: '16px', padding: '1.25rem', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', border: '1px solid rgba(0, 246, 255, 0.15)', background: 'rgba(0, 246, 255, 0.02)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Info className="gradient-text-blue" size={24} />
                  <div>
                    <h4 style={{ fontWeight: 600 }}>Public View Mode</h4>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Showing real-time tournament statistics compiled from {data.gamesCount} games. Participant standings are hidden.</p>
                  </div>
                </div>
              </div>
            )}

            <div className="cards-grid">
              {CATEGORY_KEYS.map((key) => {
                const info = CATEGORIES_INFO[key];
                const stat = data.stats?.[key] || { leader: 'No Stats Yet', value: 'N/A' };
                const isChamp = info.type === 'champion';

                const isDone = DONE_CATEGORIES.has(key);

                return (
                  <div key={key} className={`pickem-card glass ${isDone ? 'done' : ''}`} onClick={() => setActiveCategory(key)}>
                    <div className="card-header">
                      <div className="card-header-left">
                        <span className="points-badge">{info.pts} PTS</span>
                        {isDone && (
                          <span className="done-badge" title="Result locked in">
                            <CheckCircle2 size={12} /> Final
                          </span>
                        )}
                      </div>
                      <Info size={16} className="category-icon" />
                    </div>

                    <div className="card-media">
                      {isChamp && stat.leader !== 'No Stats Yet' && stat.leader !== 'N/A' ? (
                        <div className="champion-avatar-glow">
                          <img src={getChampionImage(stat.leader, data.patchVersion)} alt={stat.leader} />
                        </div>
                      ) : info.type === 'player' && stat.leader !== 'No Stats Yet' && getPlayerImage(stat.leader) ? (
                        <div className="champion-avatar-glow">
                          <img src={getPlayerImage(stat.leader)} alt={stat.leader} style={{ objectPosition: 'top' }} />
                        </div>
                      ) : info.type === 'team' && stat.leader !== 'No Stats Yet' && getTeamLogo(stat.leader) ? (
                        <div className="champion-avatar-glow" style={{ padding: '8px' }}>
                          <img src={getTeamLogo(stat.leader)} alt={stat.leader} style={{ objectFit: 'contain' }} />
                        </div>
                      ) : (
                        <div className="media-placeholder">
                          {info.type === 'player' ? <User size={48} style={{ color: 'var(--color-gold)', opacity: 0.8 }} /> :
                           info.type === 'team' ? <Shield size={48} style={{ color: 'var(--color-blue)', opacity: 0.8 }} /> :
                           info.type === 'boolean' ? <AlertCircle size={48} style={{ color: 'var(--color-red)', opacity: 0.8 }} /> :
                           <Sword size={48} style={{ color: 'var(--text-secondary)', opacity: 0.8 }} />}
                        </div>
                      )}
                      <div className="leader-name-overlay">{stat.leader}</div>
                    </div>

                    <div className="card-content">
                      <h3 className="card-title">{info.desc}</h3>
                      <div className="card-footer">
                        <div>
                          <p className="leader-label">Leader Value</p>
                          <p className="leader-value">{stat.value || 'N/A'}</p>
                        </div>
                        <span className="details-indicator">View Details →</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'leaderboard' && !viewOnly && (
          <div className="leaderboard-container">
            <div className="standings-panel glass">
              <h2><Trophy className="gradient-text-gold" size={24} /> Standings</h2>
              <div className="standings-list">
                {standings.map((player, index) => {
                  const expanded = expandedStandingIds.has(player.id);
                  const hits = player.hits || [];
                  return (
                    <div key={player.id} className={`standing-item ${expanded ? 'expanded' : ''}`}>
                      <div
                        className="standing-row"
                        role="button"
                        tabIndex={0}
                        aria-expanded={expanded}
                        onClick={() => toggleStanding(player.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            toggleStanding(player.id);
                          }
                        }}
                      >
                        <div className={`standing-rank ${index < 3 ? `standing-rank-${index + 1}` : ''}`}>
                          #{index + 1}
                        </div>
                        <div className="standing-avatar">{player.avatar}</div>
                        <div className="standing-info">
                          <span className="standing-name">{player.name}</span>
                        </div>
                        <div className="standing-score">
                          {player.score}
                          <span className="standing-pts">PTS</span>
                        </div>
                        <ChevronDown
                          size={16}
                          className="standing-chevron"
                          style={{
                            marginLeft: '0.4rem',
                            transition: 'transform 0.2s ease',
                            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                            color: 'var(--text-muted)',
                            flexShrink: 0,
                          }}
                        />
                        <div
                          className="standing-actions"
                          style={{ marginLeft: '0.5rem', display: 'flex', gap: '0.25rem' }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button aria-label="Edit participant" onClick={() => startEdit(player)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.25rem' }}>
                            <Edit size={16} />
                          </button>
                          <button aria-label="Delete participant" onClick={() => deleteParticipant(player.id)} style={{ background: 'transparent', border: 'none', color: 'var(--color-red)', cursor: 'pointer', padding: '0.25rem' }}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                      {expanded && (
                        <div className="standing-breakdown">
                          {hits.length > 0 ? (
                            <ul className="breakdown-list">
                              {hits.map((h: any) => (
                                <li key={h.key} className="breakdown-item">
                                  <span className="breakdown-label">{h.label}</span>
                                  <span className="breakdown-pick">— {h.pick}</span>
                                  <span className="breakdown-pts">+{h.pts}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="breakdown-empty">No correct picks yet.</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <button
                className="btn btn-secondary"
                style={{ width: '100%', marginTop: '1.5rem' }}
                onClick={() => {
                  setEditingParticipantId(null);
                  setNewPlayerName('');
                  setNewPlayerAvatar('👤');
                  setNewPlayerPicks(CATEGORY_KEYS.reduce((acc, key) => ({ ...acc, [key]: '' }), {}));
                  setIsAddingParticipant(true);
                }}
              >
                <Plus size={16} /> Add Participant
              </button>
            </div>

            <div className="comparison-panel glass">
              <div className="panel-header">
                <div className="panel-title">
                  <Target size={20} className="gradient-text-blue" />
                  <h2>Picks Comparison</h2>
                </div>
              </div>

              <div className="comparison-grid">
                {CATEGORY_KEYS.map((key) => {
                  const info = CATEGORIES_INFO[key];
                  const isWinrateCat = key === 'category2' || key === 'category3';
                  const lb = data.stats?.[key]?.leaderboard || [];
                  const hasQualified = isWinrateCat && lb.some((item: any) => item.qualified === true);

                  let leader: string, leaderVal: string;
                  if (isWinrateCat && !hasQualified && lb.length > 0) {
                    leader = lb[0]?.champion || 'N/A';
                    leaderVal = `${(lb[0].winrate * 100).toFixed(1)}% (${lb[0].wins}/${lb[0].picks} gp) — projected`;
                  } else {
                    leader = data.stats?.[key]?.leader || 'N/A';
                    leaderVal = data.stats?.[key]?.value || 'N/A';
                  }

                  const isDone = DONE_CATEGORIES.has(key);

                  return (
                    <div key={key} className={`compare-card glass ${isDone ? 'done' : ''}`} onClick={() => setActiveCategory(key)}>
                      <div className="compare-card-header">
                        <h4 className="compare-card-title" title={info.desc}>{info.desc}</h4>
                        {isDone && <CheckCircle2 size={16} className="compare-done-icon" aria-label="Result locked in" />}
                      </div>
                      {participants.map((player) => {
                        const pick = player.picks[key] || 'None';
                        const placement = getPickPlacementInfo(key, pick, data.stats?.[key], info);
                        const correct = placement.correct;
                        const tier = placement.tier;
                        const text = placement.text;
                        const className = correct ? `compare-pick-tier-${tier}` : 'compare-pick-incorrect';

                        return (
                          <div key={player.id} className="compare-pick-row">
                            <span className="compare-player-label">{player.name}:</span>
                            <span className={`compare-pick-val ${className}`}>
                              {pick} {correct ? '✓' : '✗'} <span style={{ fontSize: '0.75rem', opacity: 0.85, fontWeight: 500 }}>{text}</span>
                            </span>
                          </div>
                        );
                      })}
                      <div className="compare-result-row">
                        <span>{isWinrateCat && !hasQualified ? 'Projected:' : 'Leader:'}</span>
                        <span className="compare-result-leader">{leader} ({leaderVal})</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'matches' && (
          <div className="matches-list">
            {groupedMatches && groupedMatches.length > 0 ? (
              groupedMatches.map((match: any) => {
                const isExpanded = expandedMatchKey === match.key;
                const selectedGameId = selectedGameIdMap[match.key] || match.games[0]?.gameId;
                const game = match.games.find((g: any) => g.gameId === selectedGameId) || match.games[0];
                
                return (
                  <div
                    key={match.key}
                    className={`match-card glass ${isExpanded ? 'expanded' : ''}`}
                    onClick={() => setExpandedMatchKey(isExpanded ? null : match.key)}
                  >
                    <div className="match-card-main">
                      <div className="match-meta">
                        <span className="match-stage">{match.stage}</span>
                        <span className="match-date">{match.date}</span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          Series: Best of {match.games.length <= 1 ? '1' : match.games.length <= 3 ? '3' : '5'} ({match.games.length} game{match.games.length > 1 ? 's' : ''})
                        </span>
                      </div>
                      
                      <div className="match-teams-score">
                        <div className={`match-team match-team-blue ${match.wins[match.team1] > match.wins[match.team2] ? 'winner' : ''}`}>
                          {getTeamLogo(match.team1) && (
                            <img src={getTeamLogo(match.team1)} alt="" className="match-team-logo" />
                          )}
                          <span className="match-team-name">{match.team1}</span>
                        </div>
                        <div className="match-score-bubble" style={{ fontWeight: 700, minWidth: '70px' }}>
                          {match.wins[match.team1]} - {match.wins[match.team2]}
                        </div>
                        <div className={`match-team match-team-red ${match.wins[match.team2] > match.wins[match.team1] ? 'winner' : ''}`}>
                          <span className="match-team-name">{match.team2}</span>
                          {getTeamLogo(match.team2) && (
                            <img src={getTeamLogo(match.team2)} alt="" className="match-team-logo" />
                          )}
                        </div>
                      </div>
                      
                      <div className="match-stats" style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-blue)', display: 'block', fontWeight: 600 }}>
                          {isExpanded ? 'Collapse Series ▲' : 'Expand Series ▼'}
                        </span>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="match-players-expanded" onClick={(e) => e.stopPropagation()}>
                        {/* Game Selection Tabs */}
                        <div className="game-tabs">
                          {match.games.map((g: any, idx: number) => {
                            const isSelected = game.gameId === g.gameId;
                            return (
                              <button
                                key={g.gameId}
                                className={`game-tab-btn ${isSelected ? 'active' : ''}`}
                                onClick={() => setSelectedGameIdMap(prev => ({ ...prev, [match.key]: g.gameId }))}
                              >
                                Game {idx + 1}
                              </button>
                            );
                          })}
                        </div>

                        {/* Selected Game Details */}
                        <div className="match-meta" style={{ flexDirection: 'row', alignItems: 'center', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Duration: {game.duration}</span>
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Winner: <strong style={{ color: 'var(--color-blue)' }}>{game.winner}</strong></span>
                          <a
                            href={`https://gol.gg/game/stats/${game.gameId}/page-game/`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="gol-link"
                            style={{ margin: 0 }}
                          >
                            Gol.gg Stats ↗
                          </a>
                        </div>

                        <div className="match-stats" style={{ display: 'flex', gap: '2rem', marginBottom: '1.25rem', padding: '0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)' }}>
                          <p style={{ margin: 0 }}><span className="match-stat-label">First Blood:</span> <span className="match-stat-fb">{game.firstBloodKiller}</span></p>
                          <p style={{ margin: 0 }}><span className="match-stat-label">Elder Dragons:</span> 🐉 {game.blueElderDragons + game.redElderDragons}</p>
                        </div>

                        {game.players && game.players.length > 0 ? (
                          <div className="match-players-grid">
                            <div className="team-players-block">
                              <h5 className="team-header blue" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#00e676', borderBottom: '1px solid rgba(0, 230, 118, 0.1)', paddingBottom: '0.4rem', marginBottom: '0.75rem', fontSize: '0.85rem' }}>
                                🔵 {game.blueTeam} {game.winner === game.blueTeam && <span className="winner-badge">WIN</span>}
                              </h5>
                              <div className="stats-table-wrapper">
                                <table className="player-stats-table">
                                  <thead>
                                    <tr>
                                      <th>Player</th>
                                      <th>Champion</th>
                                      <th style={{ textAlign: 'center' }}>K/D/A</th>
                                      <th style={{ textAlign: 'right' }}>CS</th>
                                      <th style={{ textAlign: 'right' }}>Damage</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {game.players.filter((p: any) => p.isBlue).map((p: any) => (
                                      <tr key={p.name}>
                                        <td>
                                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <span className="player-name-bold">{p.name}</span>
                                            <span className="player-role-small">{p.role}</span>
                                          </div>
                                        </td>
                                        <td>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                            <img src={getChampionImage(p.champion)} alt={p.champion} className="stat-champ-img" onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
                                            <span style={{ fontSize: '0.8rem' }}>{p.champion}</span>
                                          </div>
                                        </td>
                                        <td style={{ textAlign: 'center', fontFamily: 'var(--font-heading)', fontWeight: 600 }}>{p.kills}/{p.deaths}/{p.assists}</td>
                                        <td style={{ textAlign: 'right' }}>{p.cs}</td>
                                        <td style={{ textAlign: 'right', color: 'var(--color-blue)', fontFamily: 'var(--font-heading)', fontWeight: 600 }}>{p.damage.toLocaleString()}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>

                            <div className="team-players-block">
                              <h5 className="team-header red" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ff1744', borderBottom: '1px solid rgba(255, 23, 68, 0.1)', paddingBottom: '0.4rem', marginBottom: '0.75rem', fontSize: '0.85rem' }}>
                                🔴 {game.redTeam} {game.winner === game.redTeam && <span className="winner-badge">WIN</span>}
                              </h5>
                              <div className="stats-table-wrapper">
                                <table className="player-stats-table">
                                  <thead>
                                    <tr>
                                      <th>Player</th>
                                      <th>Champion</th>
                                      <th style={{ textAlign: 'center' }}>K/D/A</th>
                                      <th style={{ textAlign: 'right' }}>CS</th>
                                      <th style={{ textAlign: 'right' }}>Damage</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {game.players.filter((p: any) => !p.isBlue).map((p: any) => (
                                      <tr key={p.name}>
                                        <td>
                                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <span className="player-name-bold">{p.name}</span>
                                            <span className="player-role-small">{p.role}</span>
                                          </div>
                                        </td>
                                        <td>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                            <img src={getChampionImage(p.champion)} alt={p.champion} className="stat-champ-img" onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
                                            <span style={{ fontSize: '0.8rem' }}>{p.champion}</span>
                                          </div>
                                        </td>
                                        <td style={{ textAlign: 'center', fontFamily: 'var(--font-heading)', fontWeight: 600 }}>{p.kills}/{p.deaths}/{p.assists}</td>
                                        <td style={{ textAlign: 'right' }}>{p.cs}</td>
                                        <td style={{ textAlign: 'right', color: 'var(--color-blue)', fontFamily: 'var(--font-heading)', fontWeight: 600 }}>{p.damage.toLocaleString()}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>No player stats parsed for this game.</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="glass" style={{ padding: '3rem', textAlign: 'center', borderRadius: '16px' }}>
                <AlertCircle size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem', display: 'inline-block' }} />
                <h3>No match data parsed yet</h3>
                <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Run the scraper script to retrieve the latest games from gol.gg</p>
              </div>
            )}
          </div>
        )}

        {activeCategory && (
          <div className="modal-overlay" onClick={() => setActiveCategory(null)}>
            <div className="modal-content glass" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div>
                  <h2>{CATEGORIES_INFO[activeCategory].title} Leaderboard</h2>
                  <p>{CATEGORIES_INFO[activeCategory].desc}</p>
                </div>
                <button className="close-btn" onClick={() => setActiveCategory(null)}>
                  <X size={20} />
                </button>
              </div>
              <div className="modal-body">
                {(() => {
                  const isWinrateCat = activeCategory === 'category2' || activeCategory === 'category3';
                  const lb = data.stats?.[activeCategory]?.leaderboard || [];
                  const hasQualified = isWinrateCat && lb.some((item: any) => item.qualified === true);
                  const projectedLeader = isWinrateCat && !hasQualified && lb.length > 0 ? lb[0] : null;

                  return (
                    <>
                      <div className="modal-summary-box">
                        <span className="modal-summary-label">
                          {isWinrateCat && !hasQualified ? 'Projected Leader (no one has 5+ games yet)' : 'Current Leader'}
                        </span>
                        <span className="modal-summary-val">
                          {isWinrateCat && !hasQualified
                            ? (projectedLeader?.champion || 'N/A')
                            : (data.stats?.[activeCategory]?.leader || 'N/A')}
                        </span>
                      </div>

                      <div className="modal-summary-box" style={{ background: 'rgba(255, 255, 255, 0.01)', borderColor: 'var(--border-color)', marginTop: '-0.75rem' }}>
                        <span className="modal-summary-label" style={{ color: 'var(--text-muted)' }}>
                          {isWinrateCat && !hasQualified ? 'Projected Value' : 'Leader Value'}
                        </span>
                        <span style={{ fontWeight: 600, fontFamily: 'var(--font-heading)', fontSize: '1.1rem' }}>
                          {isWinrateCat && !hasQualified && projectedLeader
                            ? `${(projectedLeader.winrate * 100).toFixed(1)}% (${projectedLeader.wins}/${projectedLeader.picks} games)`
                            : (data.stats?.[activeCategory]?.value || 'N/A')}
                        </span>
                      </div>
                    </>
                  );
                })()}

                {(activeCategory === 'category13' || activeCategory === 'category14') ? (
                  !viewOnly ? (
                    <div style={{ marginTop: '1.5rem' }}>
                      <h4 style={{ marginBottom: '0.75rem', fontFamily: 'var(--font-heading)' }}>Participant Picks</h4>
                      <div className="range-picks-list">
                        {(() => {
                          const winningLeader = data.stats?.[activeCategory]?.leader || '';
                          return participants.map((p) => {
                            const pick = p.picks[activeCategory] || 'None';
                            const correct = isPickCorrect(activeCategory, pick, winningLeader);
                            return (
                              <div key={p.id} className={`range-pick-row ${correct ? 'range-pick-correct' : ''}`}>
                                <span className="range-pick-participant">
                                  <span className="range-pick-avatar">{p.avatar}</span>
                                  <span>{p.name}</span>
                                </span>
                                <span className="range-pick-value">
                                  {pick}
                                  <span className={`range-pick-status ${correct ? 'is-correct' : 'is-incorrect'}`}>
                                    {correct ? '✓' : '✗'}
                                  </span>
                                </span>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  ) : null
                ) : (
                <>
                <div style={{ marginTop: '1.5rem' }}>
                  <h4 style={{ marginBottom: '0.75rem', fontFamily: 'var(--font-heading)' }}>Comparison Chart</h4>
                  <div className="chart-container">
                    {(() => {
                      const chartItems = getModalChartData();
                      const maxVal = Math.max(...chartItems.map((c) => c.value), 1);

                      return chartItems.map((item, idx) => {
                        const barWidth = maxVal > 0 ? (item.value / maxVal) * 100 : 0;
                        const isLeader = item.isTop3 && item.rank === 1;

                        return (
                          <div key={idx} className="chart-row">
                            <div className="chart-row-header">
                              <div className="chart-label-group">
                                {CATEGORIES_INFO[activeCategory].type === 'champion' && (
                                  <img
                                    src={getChampionImage(item.name, data.patchVersion)}
                                    alt=""
                                    style={{ width: '20px', height: '20px', borderRadius: '50%', objectFit: 'cover' }}
                                    onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
                                  />
                                )}
                                {CATEGORIES_INFO[activeCategory].type === 'player' && getPlayerImage(item.name) && (
                                  <img
                                    src={getPlayerImage(item.name)}
                                    alt=""
                                    style={{ width: '20px', height: '20px', borderRadius: '50%', objectFit: 'cover', objectPosition: 'top' }}
                                    onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
                                  />
                                )}
                                {CATEGORIES_INFO[activeCategory].type === 'team' && getTeamLogo(item.name) && (
                                  <img
                                    src={getTeamLogo(item.name)}
                                    alt=""
                                    style={{ width: '20px', height: '20px', objectFit: 'contain' }}
                                    onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
                                  />
                                )}
                                <span className="chart-item-name">{item.name}</span>
                                <div className="chart-item-badges">
                                  {TIERED_CATEGORIES.has(activeCategory) && item.tierPts ? (
                                    <span className="chart-badge chart-badge-leader">+{item.tierPts}</span>
                                  ) : item.isTop3 ? (
                                    <span className="chart-badge chart-badge-leader">#{item.rank} Leader</span>
                                  ) : null}
                                  {!item.isTop3 && item.rank && !TIERED_CATEGORIES.has(activeCategory) && (
                                    <span className="chart-badge" style={{ background: 'rgba(255, 255, 255, 0.06)', color: 'var(--text-muted)', fontSize: '0.65rem' }}>
                                      #{item.rank}
                                    </span>
                                  )}
                                  {item.qualified === false && (activeCategory === 'category2' || activeCategory === 'category3') && (
                                    <span className="chart-badge" style={{ background: 'rgba(255, 180, 0, 0.15)', color: '#ffb400', fontSize: '0.65rem' }}>
                                      {item.picks || 0}/5 games
                                    </span>
                                  )}
                                  {item.pickedBy.length > 0 && !viewOnly && (
                                    <span className="chart-badge chart-badge-pick">Picked</span>
                                  )}
                                </div>
                              </div>
                              <span className="chart-item-val" style={{ color: isLeader ? 'var(--color-blue)' : 'var(--text-primary)' }}>
                                {item.displayVal}
                              </span>
                            </div>
                            <div className="chart-bar-outer">
                              <div
                                className={`chart-bar-inner ${item.isTop3 ? 'chart-bar-blue' : 'chart-bar-gold'}`}
                                style={{ width: `${Math.max(barWidth, 2)}%` }}
                              />
                              {!viewOnly && (
                                <div className="chart-bar-participants">
                                  {item.pickedBy.map((p: any) => (
                                    <span
                                      key={p.id}
                                      className="chart-bar-participant"
                                      title={`${p.name}'s pick`}
                                    >
                                      <span className="chart-bar-participant-avatar">{p.avatar}</span>
                                      <span className="chart-bar-participant-name">{p.name}</span>
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                  {(() => {
                    const warnings: string[] = [];
                    if (activeCategory === 'category2' || activeCategory === 'category3') {
                      const checkedChamps = new Set<string>();
                      participants.forEach((p) => {
                        const pick = p.picks[activeCategory];
                        if (pick && !checkedChamps.has(pick.toLowerCase())) {
                          checkedChamps.add(pick.toLowerCase());

                          let actualPicksCount = 0;
                          if (data.games) {
                            data.games.forEach((g: any) => {
                              g.players.forEach((pl: any) => {
                                if (pl.champion.toLowerCase() === pick.toLowerCase()) {
                                  actualPicksCount++;
                                }
                              });
                            });
                          }

                          if (actualPicksCount > 0 && actualPicksCount < 5) {
                            warnings.push(
                              `"${pick}" has been picked ${actualPicksCount} time${actualPicksCount > 1 ? 's' : ''} in the tournament but does not meet the minimum requirement of 5 games to qualify for the winrate leaderboard.`
                            );
                          }
                        }
                      });
                    }

                    return warnings.map((warning, wIdx) => (
                      <div
                        key={wIdx}
                        className="threshold-warning glass"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          padding: '0.75rem 1rem',
                          borderRadius: '8px',
                          marginTop: '0.75rem',
                          background: 'rgba(255, 179, 0, 0.05)',
                          border: '1px dashed rgba(255, 179, 0, 0.3)',
                          fontSize: '0.85rem',
                        }}
                      >
                        <AlertCircle size={16} style={{ color: '#ffb300', flexShrink: 0 }} />
                        <span style={{ color: 'var(--text-secondary)' }}>{warning}</span>
                      </div>
                    ));
                  })()}
                </div>

                <div style={{ marginTop: '1.5rem' }}>
                  <h4 style={{ marginBottom: '0.75rem', fontFamily: 'var(--font-heading)' }}>Rankings Table</h4>
                  {data.stats?.[activeCategory]?.leaderboard && data.stats[activeCategory].leaderboard.length > 0 ? (
                    <table className="leaderboard-table">
                      <thead>
                        <tr>
                          <th>Rank</th>
                          <th>Name</th>
                          <th style={{ textAlign: 'right' }}>Metric</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.stats[activeCategory].leaderboard.map((item: any, index: number) => {
                          const name = resolveEntryName(item, activeCategory);
                          const displayVal = item.count !== undefined ? `${item.count} picks` :
                            item.winrate !== undefined ? `${(item.winrate * 100).toFixed(1)}% (${item.wins}/${item.picks})` :
                            item.kills !== undefined ? `${item.kills} kills` :
                            item.kdaFormatted !== undefined ? `${item.kdaFormatted} KDA (${item.kills}/${item.deaths}/${item.assists})` :
                            item.cs !== undefined ? `${item.cs} CS` :
                            item.fbCount !== undefined ? `${item.fbCount} FB` :
                            item.avgDmg !== undefined ? `${item.avgDmg} DPM` :
                            item.elderDragons !== undefined ? `${item.elderDragons} Elder Dragons` :
                            item.uniqueCount !== undefined ? `${item.uniqueCount} pool size` :
                            item.bans !== undefined ? `${item.bans} bans` :
                            item.duration !== undefined ? `${item.duration}` :
                            String(item);

                          const isLeader = index === 0;

                          return (
                            <tr key={index} className={isLeader ? 'leader-row' : ''}>
                              <td className="row-rank">#{index + 1}</td>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  {CATEGORIES_INFO[activeCategory].type === 'champion' && (
                                    <img
                                      src={getChampionImage(name, data.patchVersion)}
                                      alt={name}
                                      style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
                                      onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
                                    />
                                  )}
                                  {CATEGORIES_INFO[activeCategory].type === 'player' && getPlayerImage(name) && (
                                    <img
                                      src={getPlayerImage(name)}
                                      alt={name}
                                      style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', objectPosition: 'top' }}
                                      onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
                                    />
                                  )}
                                  {CATEGORIES_INFO[activeCategory].type === 'team' && getTeamLogo(name) && (
                                    <img
                                      src={getTeamLogo(name)}
                                      alt={name}
                                      style={{ width: '32px', height: '32px', objectFit: 'contain' }}
                                      onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
                                    />
                                  )}
                                  <span>{name}</span>
                                </div>
                              </td>
                              <td className="row-val">{displayVal}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  ) : (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', padding: '1rem' }}>No rankings available yet.</p>
                  )}
                </div>
                </>
                )}
              </div>
            </div>
          </div>
        )}

        {(isAddingParticipant || editingParticipantId !== null) && (
          <div className="modal-overlay" onClick={() => { setIsAddingParticipant(false); setEditingParticipantId(null); }}>
            <div className="modal-content glass" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px' }}>
              <div className="modal-header">
                <h2>{editingParticipantId ? 'Edit Participant Picks' : 'Add New Participant'}</h2>
                <button className="close-btn" onClick={() => { setIsAddingParticipant(false); setEditingParticipantId(null); }}>
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={editingParticipantId ? handleEditParticipantSubmit : handleAddParticipantSubmit}>
                <div className="modal-body" style={{ maxHeight: '75vh' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div className="form-group">
                      <label>Participant Name</label>
                      <input
                        type="text"
                        className="form-control"
                        value={newPlayerName}
                        onChange={(e) => setNewPlayerName(e.target.value)}
                        placeholder="e.g. Faker Fanboy"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Avatar</label>
                      <select
                        className="form-control"
                        value={newPlayerAvatar}
                        onChange={(e) => setNewPlayerAvatar(e.target.value)}
                      >
                        <option value="👤">👤 Human</option>
                        <option value="🔥">🔥 Flame</option>
                        <option value="🧠">🧠 Brain</option>
                        <option value="🎮">🎮 Gamepad</option>
                        <option value="⚡">⚡ Lightning</option>
                        <option value="👑">👑 Crown</option>
                        <option value="⚔️">⚔️ Swords</option>
                        <option value="🦄">🦄 Unicorn</option>
                      </select>
                    </div>
                  </div>

                  <h4 style={{ marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem', fontFamily: 'var(--font-heading)' }}>Picks Selections</h4>

                  <datalist id="pickems-champions">
                    {champions.map((opt) => (
                      <option key={opt} value={opt} />
                    ))}
                  </datalist>
                  <datalist id="pickems-teams">
                    {teams.map((opt) => (
                      <option key={opt} value={opt} />
                    ))}
                  </datalist>
                  <datalist id="pickems-players">
                    {players.map((opt) => (
                      <option key={opt} value={opt} />
                    ))}
                  </datalist>
                  <datalist id="pickems-boolean">
                    <option value="Yes" />
                    <option value="No" />
                  </datalist>

                  <div className="editor-grid">
                    {CATEGORY_KEYS.map((key) => {
                      const info = CATEGORIES_INFO[key];
                      const currentPick = newPlayerPicks[key];
                      const listId =
                        info.type === 'champion' ? 'pickems-champions' :
                        info.type === 'team'     ? 'pickems-teams' :
                        info.type === 'player'   ? 'pickems-players' :
                        info.type === 'boolean'  ? 'pickems-boolean' :
                        undefined;

                      return (
                        <div key={key} className="form-group">
                          <label title={info.desc}>{info.label} ({info.pts} pts)</label>
                          <input
                            type="text"
                            className="form-control"
                            list={listId}
                            value={currentPick}
                            onChange={(e) => setNewPlayerPicks({ ...newPlayerPicks, [key]: e.target.value })}
                            placeholder={
                              listId
                                ? `Search ${info.type}s… (e.g. ${info.title})`
                                : `Your pick (e.g. ${info.title})`
                            }
                            required
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div style={{ padding: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => { setIsAddingParticipant(false); setEditingParticipantId(null); }}>
                    Cancel
                  </button>
                  <button type="submit" className="btn">
                    Save Selections
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {isTokenModalOpen && (
          <div className="modal-overlay" onClick={() => setIsTokenModalOpen(false)}>
            <div className="modal-content glass" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '450px' }}>
              <div className="modal-header">
                <div>
                  <h2>Admin Passcode Required</h2>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>To trigger the scraper workflow, enter the Admin Passcode/PIN configured on your Cloudflare Worker.</p>
                </div>
                <button className="close-btn" onClick={() => setIsTokenModalOpen(false)}>
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleTokenSubmit}>
                <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div className="form-group">
                    <label htmlFor="admin-passcode-input">Admin Passcode (PIN)</label>
                    <input
                      id="admin-passcode-input"
                      type="password"
                      className="form-control"
                      placeholder="Enter Admin PIN"
                      value={tempToken}
                      onChange={(e) => setTempToken(e.target.value)}
                      required
                    />
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem', lineHeight: '1.4' }}>
                      The passcode is saved securely in your browser&apos;s local storage so you only have to enter it once per device.
                    </p>
                  </div>
                </div>
                <div style={{ padding: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setIsTokenModalOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn">
                    Save and Trigger
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="footer-bar">
          <div>
            <span>MSI 2026 Mid-Season Invitational • </span>
            <span>Source of Truth: <a href="https://gol.gg/esports/home/" target="_blank" rel="noreferrer" style={{ color: 'var(--color-blue)', textDecoration: 'none' }}>gol.gg</a></span>
          </div>

          <div className="refresh-panel">
            <RefreshCw size={18} className={isTriggeringScraper ? 'spin' : ''} />
            <div className="refresh-text">
              <p>Data Status</p>
              <p>Last Scraped: {hydrated ? new Date(data.lastUpdated).toLocaleString() : ''}</p>
            </div>
            {!viewOnly && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ marginLeft: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.3rem 0.75rem', fontSize: '0.8rem', minHeight: 'auto' }}
                disabled={isTriggeringScraper}
                onClick={() => triggerScraper()}
              >
                Rerun Scraper
              </button>
            )}
            {scraperStatusMessage && (
              <span style={{ fontSize: '0.75rem', color: scraperStatusMessage.includes('Success') ? 'var(--color-blue)' : 'var(--color-red)', marginLeft: '0.5rem' }}>
                {scraperStatusMessage}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
