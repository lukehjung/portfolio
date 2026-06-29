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
} from 'lucide-react';

const CATEGORY_KEYS = [
  'category1', 'category2', 'category3', 'category4',
  'category5', 'category6', 'category7', 'category8',
  'category9', 'category10', 'category11', 'category12',
  'category13', 'category14', 'category15', 'category16',
];

const CATEGORIES_INFO: Record<string, any> = {
  category1: { key: 'category1', title: 'Vi', label: 'Most Picked Champ', pts: 50, desc: 'For MSI Play-ins: which champion will be picked the most?', type: 'champion' },
  category2: { key: 'category2', title: 'Ashe', label: 'Highest WR Champ', pts: 50, desc: 'Which champion will have the highest winrate? (minimum 5 games played)', type: 'champion' },
  category3: { key: 'category3', title: 'JarvanIV', label: 'Lowest WR Champ', pts: 50, desc: 'Which champion will have the lowest winrate? (minimum 5 games played)', type: 'champion' },
  category4: { key: 'category4', title: 'Ezreal', label: 'Most Kills Champ', pts: 50, desc: 'Which champion will have the most kills?', type: 'champion' },
  category5: { key: 'category5', title: 'Keria', label: 'Highest KDA Pro', pts: 50, desc: 'For MSI Play-ins: which pro will have the highest KDA?', type: 'player' },
  category6: { key: 'category6', title: 'Viper', label: 'Highest Single CS', pts: 100, desc: 'Which pro will earn the highest CS in a single game?', type: 'player' },
  category7: { key: 'category7', title: 'Oner', label: 'Most First Bloods', pts: 50, desc: 'Which pro will get the most First Bloods?', type: 'player' },
  category8: { key: 'category8', title: 'Peyz', label: 'Highest Avg Damage', pts: 50, desc: 'Which pro will finish with the highest average damage per game?', type: 'player' },
  category9: { key: 'category9', title: 'T1', label: 'Shortest Game Win', pts: 100, desc: 'For MSI Play-ins: which team will win the shortest game (duration)?', type: 'team' },
  category10: { key: 'category10', title: 'T1', label: 'Most Elder Dragons', pts: 50, desc: 'Which team will kill the most Elder Dragons?', type: 'team' },
  category11: { key: 'category11', title: 'FURIA', label: 'Least Kills Game', pts: 50, desc: 'Which team will get the least kills in a single game?', type: 'team' },
  category12: { key: 'category12', title: 'T1', label: 'Largest Champ Pool', pts: 50, desc: 'Which team will play the most unique Champions (largest champion pool)?', type: 'team' },
  category13: { key: 'category13', title: '31-45', label: 'Max Game Kills', pts: 50, desc: 'For MSI Play-ins: what will be the highest number of kills in a single game?', type: 'range' },
  category14: { key: 'category14', title: '105-109', label: 'Unique Champs Picked', pts: 50, desc: 'How many unique champions will be picked?', type: 'range' },
  category15: { key: 'category15', title: 'False. Never.', label: 'Will Teemo Be Picked', pts: 100, desc: 'Will Teemo be picked?', type: 'boolean' },
  category16: { key: 'category16', title: 'Bard', label: 'Most Banned Champ', pts: 50, desc: 'Which champion will be banned the most?', type: 'champion' },
};

const cleanName = (str: string) => {
  if (!str) return '';
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
};

const isKillsRangeMatch = (pickRange: string, actualKillsText: string) => {
  if (!pickRange || !actualKillsText) return false;
  const kills = parseInt(actualKillsText.replace(/\D/g, ''));
  if (isNaN(kills)) return false;

  const cleanRange = pickRange.trim();
  if (cleanRange.startsWith('<')) {
    const val = parseInt(cleanRange.replace('<', ''));
    return kills < val;
  }
  if (cleanRange.startsWith('>')) {
    const val = parseInt(cleanRange.replace('>', ''));
    return kills > val;
  }
  if (cleanRange.includes('-')) {
    const [min, max] = cleanRange.split('-').map(Number);
    return kills >= min && kills <= max;
  }
  return false;
};

const isChampsRangeMatch = (pickRange: string, actualCountText: string) =>
  isKillsRangeMatch(pickRange, actualCountText);

const isPickCorrect = (categoryKey: string, pick: string, leaderName: string) => {
  if (!leaderName || leaderName === 'N/A' || leaderName === 'Unknown') return false;

  if (categoryKey === 'category13') return isKillsRangeMatch(pick, leaderName);
  if (categoryKey === 'category14') return isChampsRangeMatch(pick, leaderName);
  if (categoryKey === 'category15') {
    const cleanPick = pick.toLowerCase();
    const cleanLeader = leaderName.toLowerCase();
    const isYesPick = cleanPick === 'yes' || cleanPick === 'true' || cleanPick === 'will be picked';
    const isYesLeader = cleanLeader === 'yes' || cleanLeader === 'true';
    return isYesPick === isYesLeader;
  }

  return cleanName(pick) === cleanName(leaderName);
};

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

const MSI_PROXY_URL = 'https://msi-proxy.lukethejung.workers.dev/api/msi';
const PARTICIPANTS_URL = 'https://msi-proxy.lukethejung.workers.dev/api/participants';

export default function PickemsPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [data, setData] = useState<any>(msiData);
  const [participants, setParticipants] = useState<any[]>(defaultParticipants as any);
  const [hydrated, setHydrated] = useState(false);

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
  const [champions, setChampions] = useState<string[]>([]);

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

  const teams = useMemo(() => {
    const set = new Set<string>();
    (data.msiTeams || []).forEach((t: string) => t && set.add(t));
    (data.games || []).forEach((g: any) => {
      if (g.blueTeam) set.add(g.blueTeam);
      if (g.redTeam) set.add(g.redTeam);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [data.msiTeams, data.games]);

  const players = useMemo(() => {
    const set = new Set<string>();
    (data.msiPlayers || []).forEach((p: string) => p && set.add(p));
    (data.games || []).forEach((g: any) => {
      (g.players || []).forEach((p: any) => {
        if (p.name) set.add(p.name);
      });
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
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

    const top3: any[] = leaderboard.slice(0, 3).map((item: any, idx: number) => ({
      name: item.champion || item.player || item.team || 'Unknown',
      value: getNumericValue(item, activeCategory),
      displayVal: getDisplayValue(item),
      isTop3: true,
      rank: idx + 1,
      pickedBy: [],
      qualified: item.qualified,
      picks: item.picks,
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
          const name = item.champion || item.player || item.team || 'Unknown';
          return cleanName(name) === cleanPick;
        });

        if (lbItem) {
          const addedIndex = top3.findIndex((t) => cleanName(t.name) === cleanPick);
          if (addedIndex !== -1) {
            top3[addedIndex].pickedBy.push(p);
          } else {
            const lbIndex = leaderboard.indexOf(lbItem);
            top3.push({
              name: lbItem.champion || lbItem.player || lbItem.team || 'Unknown',
              value: getNumericValue(lbItem, activeCategory),
              displayVal: getDisplayValue(lbItem),
              isTop3: false,
              rank: lbIndex + 1,
              pickedBy: [p],
              qualified: lbItem.qualified,
              picks: lbItem.picks,
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

  const calculateParticipantScore = (participant: any) => {
    let score = 0;
    if (!data.stats) return 0;
    CATEGORY_KEYS.forEach((key) => {
      const pick = participant.picks[key];
      const leader = data.stats[key]?.leader;
      if (isPickCorrect(key, pick, leader)) {
        score += CATEGORIES_INFO[key].pts;
      }
    });
    return score;
  };

  const getStandings = () =>
    participants
      .map((p) => ({ ...p, score: calculateParticipantScore(p) }))
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

        .pickems-page .leaderboard-container { display: grid; grid-template-columns: 1fr 2.5fr; gap: 2rem; align-items: start; }
        @media (max-width: 968px) { .pickems-page .leaderboard-container { grid-template-columns: 1fr; } }
        .pickems-page .standings-panel { border-radius: 16px; padding: 1.5rem; box-shadow: var(--shadow-md); }
        .pickems-page .standings-panel h2 { font-family: var(--font-heading); font-size: 1.5rem; margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.5rem; }
        .pickems-page .standings-list { display: flex; flex-direction: column; gap: 0.75rem; }
        .pickems-page .standing-item {
          display: flex; align-items: center; padding: 1rem; border-radius: 12px;
          background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.04);
          transition: all 0.2s ease;
        }
        .pickems-page .standing-item:hover { background: rgba(255, 255, 255, 0.04); border-color: rgba(0, 246, 255, 0.15); }
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

        .pickems-page .comparison-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 1.25rem; }
        .pickems-page .compare-card {
          border-radius: 12px; padding: 1.25rem;
          background: rgba(255, 255, 255, 0.01); border: 1px solid rgba(255, 255, 255, 0.04);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); cursor: pointer;
        }
        .pickems-page .compare-card:hover { background: rgba(255, 255, 255, 0.02); border-color: rgba(0, 246, 255, 0.25); box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25); transform: translateY(-2px); }
        .pickems-page .compare-card-title { font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.75rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 500; }
        .pickems-page .compare-pick-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; font-size: 0.9rem; }
        .pickems-page .compare-player-label { color: var(--text-muted); }
        .pickems-page .compare-pick-val { font-family: var(--font-heading); font-weight: 700; }
        .pickems-page .compare-pick-correct { color: var(--color-green); }
        .pickems-page .compare-pick-incorrect { color: var(--color-red); }
        .pickems-page .compare-result-row { border-top: 1px dashed rgba(255, 255, 255, 0.05); padding-top: 0.5rem; margin-top: 0.5rem; display: flex; justify-content: space-between; font-size: 0.85rem; }
        .pickems-page .compare-result-leader { color: var(--color-blue); font-weight: 600; }

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
          display: flex; justify-content: space-between; align-items: center; gap: 1.5rem;
          transition: all 0.2s ease;
        }
        .pickems-page .match-card:hover { border-color: rgba(255, 255, 255, 0.12); transform: scale(1.002); }
        .pickems-page .match-meta { display: flex; flex-direction: column; gap: 0.25rem; }
        .pickems-page .match-stage {
          font-size: 0.75rem; background: rgba(0, 246, 255, 0.08); border: 1px solid rgba(0, 246, 255, 0.15);
          color: var(--color-blue); padding: 0.2rem 0.5rem; border-radius: 4px; align-self: flex-start;
          font-family: var(--font-heading); font-weight: 600; text-transform: uppercase;
        }
        .pickems-page .match-date { font-size: 0.85rem; color: var(--text-muted); }
        .pickems-page .match-teams-score { display: flex; align-items: center; gap: 2rem; flex-grow: 1; justify-content: center; }
        .pickems-page .match-team { display: flex; flex-direction: column; align-items: center; width: 180px; }
        .pickems-page .match-team-name { font-family: var(--font-heading); font-size: 1.2rem; font-weight: 700; text-align: center; }
        .pickems-page .match-team.winner .match-team-name { color: var(--color-blue); }
        .pickems-page .match-team.loser { opacity: 0.6; }
        .pickems-page .match-score-bubble {
          background: var(--bg-tertiary); border: 1px solid var(--border-color);
          padding: 0.5rem 1.5rem; border-radius: 30px;
          font-family: var(--font-heading); font-size: 1.5rem; font-weight: 800; letter-spacing: 2px;
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
        .pickems-page .chart-bar-participants { position: absolute; right: 0.75rem; top: 0; height: 100%; display: flex; align-items: center; gap: 0.35rem; font-size: 1.1rem; }
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
            <button className={`tab-btn ${activeTab === 'leaderboard' ? 'active' : ''}`} onClick={() => setActiveTab('leaderboard')}>
              <Trophy size={18} /> Standings
            </button>
            <button className={`tab-btn ${activeTab === 'matches' ? 'active' : ''}`} onClick={() => setActiveTab('matches')}>
              <Calendar size={18} /> Matches ({data.gamesCount || 0})
            </button>
          </div>
        </header>

        {activeTab === 'dashboard' && (
          <div>
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

            <div className="cards-grid">
              {CATEGORY_KEYS.map((key) => {
                const info = CATEGORIES_INFO[key];
                const stat = data.stats?.[key] || { leader: 'No Stats Yet', value: 'N/A' };
                const isChamp = info.type === 'champion';

                return (
                  <div key={key} className="pickem-card glass" onClick={() => setActiveCategory(key)}>
                    <div className="card-header">
                      <span className="points-badge">{info.pts} PTS</span>
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

        {activeTab === 'leaderboard' && (
          <div className="leaderboard-container">
            <div className="standings-panel glass">
              <h2><Trophy className="gradient-text-gold" size={24} /> Standings</h2>
              <div className="standings-list">
                {standings.map((player, index) => (
                  <div key={player.id} className="standing-item">
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
                    <div style={{ marginLeft: '0.75rem', display: 'flex', gap: '0.25rem' }}>
                      <button onClick={() => startEdit(player)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                        <Edit size={14} />
                      </button>
                      <button onClick={() => deleteParticipant(player.id)} style={{ background: 'transparent', border: 'none', color: 'var(--color-red)', cursor: 'pointer' }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
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

                  return (
                    <div key={key} className="compare-card glass" onClick={() => setActiveCategory(key)}>
                      <h4 className="compare-card-title" title={info.desc}>{info.desc}</h4>
                      {participants.map((player) => {
                        const pick = player.picks[key] || 'None';
                        const correct = isPickCorrect(key, pick, leader);
                        return (
                          <div key={player.id} className="compare-pick-row">
                            <span className="compare-player-label">{player.name}:</span>
                            <span className={`compare-pick-val ${correct ? 'compare-pick-correct' : 'compare-pick-incorrect'}`}>
                              {pick} {correct ? '✓' : '✗'}
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
            {data.games && data.games.length > 0 ? (
              [...data.games].reverse().map((game: any) => (
                <div key={game.gameId} className="match-card glass">
                  <div className="match-meta">
                    <span className="match-stage">{game.stage}</span>
                    <span className="match-date">{game.date}</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Duration: {game.duration}</span>
                  </div>
                  <div className="match-teams-score">
                    <div className={`match-team ${game.winner === game.blueTeam ? 'winner' : 'loser'}`} style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '0.5rem', justifyContent: 'flex-end', width: '220px' }}>
                      {getTeamLogo(game.blueTeam) && (
                        <img src={getTeamLogo(game.blueTeam)} alt="" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
                      )}
                      <span className="match-team-name">{game.blueTeam}</span>
                    </div>
                    <div className="match-score-bubble">
                      {game.blueKills} - {game.redKills}
                    </div>
                    <div className={`match-team ${game.winner === game.redTeam ? 'winner' : 'loser'}`} style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '0.5rem', justifyContent: 'flex-start', width: '220px' }}>
                      <span className="match-team-name">{game.redTeam}</span>
                      {getTeamLogo(game.redTeam) && (
                        <img src={getTeamLogo(game.redTeam)} alt="" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
                      )}
                    </div>
                  </div>
                  <div className="match-meta" style={{ textAlign: 'right', minWidth: '150px' }}>
                    <p style={{ fontSize: '0.85rem' }}><span style={{ color: 'var(--text-muted)' }}>First Blood:</span> <span style={{ color: 'var(--color-gold)', fontWeight: 600 }}>{game.firstBloodKiller}</span></p>
                    <p style={{ fontSize: '0.85rem' }}><span style={{ color: 'var(--text-muted)' }}>Elder Dragons:</span> 🐉 {game.blueElderDragons + game.redElderDragons}</p>
                  </div>
                </div>
              ))
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
                                  {item.isTop3 && (
                                    <span className="chart-badge chart-badge-leader">#{item.rank} Leader</span>
                                  )}
                                  {!item.isTop3 && item.rank && (
                                    <span className="chart-badge" style={{ background: 'rgba(255, 255, 255, 0.06)', color: 'var(--text-muted)', fontSize: '0.65rem' }}>
                                      #{item.rank}
                                    </span>
                                  )}
                                  {item.qualified === false && (activeCategory === 'category2' || activeCategory === 'category3') && (
                                    <span className="chart-badge" style={{ background: 'rgba(255, 180, 0, 0.15)', color: '#ffb400', fontSize: '0.65rem' }}>
                                      {item.picks || 0}/5 games
                                    </span>
                                  )}
                                  {item.pickedBy.length > 0 && (
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
                              <div className="chart-bar-participants">
                                {item.pickedBy.map((p: any) => (
                                  <span key={p.id} title={`${p.name}'s pick`} style={{ cursor: 'help' }}>
                                    {p.avatar}
                                  </span>
                                ))}
                              </div>
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
                          const name = item.champion || item.player || item.team || item.gameId || 'Unknown';
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

        <div className="footer-bar">
          <div>
            <span>MSI 2026 Mid-Season Invitational • </span>
            <span>Source of Truth: <a href="https://gol.gg/esports/home/" target="_blank" rel="noreferrer" style={{ color: 'var(--color-blue)', textDecoration: 'none' }}>gol.gg</a></span>
          </div>

          <div className="refresh-panel">
            <RefreshCw size={18} />
            <div className="refresh-text">
              <p>Data Status</p>
              <p>Last Scraped: {hydrated ? new Date(data.lastUpdated).toLocaleString() : ''}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
