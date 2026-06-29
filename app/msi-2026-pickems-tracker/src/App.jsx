import React, { useState, useEffect } from 'react';
import msiData from './data/msi_data.json';
import defaultParticipants from './data/participants.json';
import { 
  Trophy, 
  Flame, 
  Calendar, 
  RefreshCw, 
  Info, 
  Plus, 
  Trash2, 
  Edit, 
  Check, 
  X, 
  Award, 
  User, 
  Shield, 
  Sword, 
  Target, 
  AlertCircle 
} from 'lucide-react';

const CATEGORY_KEYS = [
  'category1', 'category2', 'category3', 'category4',
  'category5', 'category6', 'category7', 'category8',
  'category9', 'category10', 'category11', 'category12',
  'category13', 'category14', 'category15', 'category16'
];

const CATEGORIES_INFO = {
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
  category16: { key: 'category16', title: 'Bard', label: 'Most Banned Champ', pts: 50, desc: 'Which champion will be banned the most?', type: 'champion' }
};

// Normalized name check
const cleanName = (str) => {
  if (!str) return '';
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
};

const isKillsRangeMatch = (pickRange, actualKillsText) => {
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

const isChampsRangeMatch = (pickRange, actualCountText) => {
  return isKillsRangeMatch(pickRange, actualCountText);
};

const isPickCorrect = (categoryKey, pick, leaderName) => {
  if (!leaderName || leaderName === 'N/A' || leaderName === 'Unknown') return false;

  if (categoryKey === 'category13') {
    return isKillsRangeMatch(pick, leaderName);
  }
  if (categoryKey === 'category14') {
    return isChampsRangeMatch(pick, leaderName);
  }
  if (categoryKey === 'category15') {
    const cleanPick = pick.toLowerCase();
    const cleanLeader = leaderName.toLowerCase();
    const isYesPick = cleanPick === 'yes' || cleanPick === 'true' || cleanPick === 'will be picked';
    const isYesLeader = cleanLeader === 'yes' || cleanLeader === 'true';
    return isYesPick === isYesLeader;
  }

  return cleanName(pick) === cleanName(leaderName);
};

const getChampionImage = (name, patchVersion = '15.1.1') => {
  if (!name || name === 'N/A' || name === 'Unknown') return '';
  
  // Normalize naming conventions for Riot Data Dragon
  let clean = name.replace(/[^a-zA-Z]/g, ''); // Remove spaces, punctuation, numbers
  
  // Custom mappings for special cases in Data Dragon
  if (clean.toLowerCase() === 'wukong') {
    clean = 'MonkeyKing';
  } else if (clean.toLowerCase() === 'leblanc') {
    clean = 'Leblanc';
  } else if (clean.toLowerCase() === 'khazix') {
    clean = 'Khazix';
  } else if (clean.toLowerCase() === 'chogath') {
    clean = 'Chogath';
  } else if (clean.toLowerCase() === 'kaisa') {
    clean = 'Kaisa';
  } else if (clean.toLowerCase() === 'velkoz') {
    clean = 'Velkoz';
  } else if (clean.toLowerCase() === 'nunuwillump') {
    clean = 'Nunu';
  }
  
  return `https://ddragon.leagueoflegends.com/cdn/${patchVersion}/img/champion/${clean}.png`;
};

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [data, setData] = useState(msiData);
  const [participants, setParticipants] = useState(() => {
    const saved = localStorage.getItem('pickems_participants');
    if (saved) {
      const parsed = JSON.parse(saved);
      const migrated = parsed.map((p) =>
        p.name === 'Screenshot Picks' ? { ...p, name: "Luke Jung's Picks" } : p
      );
      const hasChristy = migrated.some((p) => p.name === 'Christy Oh' || p.id === '3');
      if (!hasChristy) {
        const christy = defaultParticipants.find((p) => p.name === 'Christy Oh');
        if (christy) migrated.push(christy);
      }
      return migrated;
    }
    return defaultParticipants;
  });

  const [activeCategory, setActiveCategory] = useState(null);
  const [isAddingParticipant, setIsAddingParticipant] = useState(false);
  const [editingParticipantId, setEditingParticipantId] = useState(null);
  
  // Form fields
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerAvatar, setNewPlayerAvatar] = useState('👤');
  const [newPlayerPicks, setNewPlayerPicks] = useState(
    CATEGORY_KEYS.reduce((acc, key) => ({ ...acc, [key]: '' }), {})
  );

  useEffect(() => {
    localStorage.setItem('pickems_participants', JSON.stringify(participants));
  }, [participants]);

  // Handle data updates in case scraper is run
  useEffect(() => {
    // Check if new data is available or check dynamically
    setData(msiData);
  }, []);

  const getPlayerImage = (name) => {
    if (!name) return '';
    const clean = name.toLowerCase().trim();
    return data.playerImages?.[clean] || '';
  };

  const getTeamLogo = (name) => {
    if (!name) return '';
    const clean = name.toLowerCase().trim();
    return data.teamImages?.[clean] || '';
  };

  const getModalChartData = () => {
    if (!activeCategory || !data.stats?.[activeCategory]) return [];

    const stat = data.stats[activeCategory];
    const leaderboard = stat.leaderboard || [];

    // Helper to extract numeric value for scaling (larger number is better performance)
    function getNumericValue(item, catKey) {
      if (catKey === 'category3') {
        return 100 - (item.winrate * 100);
      }
      if (catKey === 'category11') {
        return 50 - item.kills;
      }
      if (catKey === 'category9' && item.seconds !== undefined) {
        return 3600 - item.seconds;
      }
      if (item.count !== undefined) return item.count;
      if (item.winrate !== undefined) return item.winrate * 100;
      if (item.kda !== undefined) return item.kda;
      if (item.kills !== undefined) return item.kills;
      if (item.cs !== undefined) return item.cs;
      if (item.fbCount !== undefined) return item.fbCount;
      if (item.avgDmg !== undefined) return item.avgDmg;
      if (item.elderDragons !== undefined) return item.elderDragons;
      if (item.uniqueCount !== undefined) return item.uniqueCount;
      return 0;
    }

    function getDisplayValue(item) {
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
      if (item.duration !== undefined) return `${item.duration}`;
      return '';
    }

    // Top 3 items
    const top3 = leaderboard.slice(0, 3).map((item, idx) => ({
      name: item.champion || item.player || item.team || 'Unknown',
      value: getNumericValue(item, activeCategory),
      displayVal: getDisplayValue(item),
      isTop3: true,
      rank: idx + 1,
      pickedBy: [],
      qualified: item.qualified,
      picks: item.picks
    }));

    // Map participant picks
    participants.forEach((p) => {
      const rawPick = p.picks[activeCategory];
      if (!rawPick) return;

      const cleanPick = cleanName(rawPick);

      // See if it matches any in top 3
      const existingIndex = top3.findIndex((t) => cleanName(t.name) === cleanPick);
      if (existingIndex !== -1) {
        top3[existingIndex].pickedBy.push(p);
      } else {
        // Find in full leaderboard
        const lbItem = leaderboard.find((item) => {
          const name = item.champion || item.player || item.team || 'Unknown';
          return cleanName(name) === cleanPick;
        });

        if (lbItem) {
          // Check if already added (avoid duplicate participant entries if multiple have same pick)
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
              picks: lbItem.picks
            });
          }
        } else {
          // Not in stats (0 value / unqualified)
          const addedIndex = top3.findIndex((t) => cleanName(t.name) === cleanPick);
          if (addedIndex !== -1) {
            top3[addedIndex].pickedBy.push(p);
          } else {
            // Count actual games played to verify if it has been picked
            let actualPicksCount = 0;
            if (data.games) {
              data.games.forEach(g => {
                g.players.forEach(pl => {
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
              displayVal: displayVal,
              isTop3: false,
              pickedBy: [p]
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

  const calculateParticipantScore = (participant) => {
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

  const getStandings = () => {
    return participants
      .map((p) => ({
        ...p,
        score: calculateParticipantScore(p)
      }))
      .sort((a, b) => b.score - a.score);
  };

  const handleAddParticipantSubmit = (e) => {
    e.preventDefault();
    if (!newPlayerName.trim()) return;

    const newPlayer = {
      id: Date.now().toString(),
      name: newPlayerName.trim(),
      avatar: newPlayerAvatar,
      picks: newPlayerPicks
    };

    setParticipants([...participants, newPlayer]);
    setNewPlayerName('');
    setNewPlayerAvatar('👤');
    setNewPlayerPicks(CATEGORY_KEYS.reduce((acc, key) => ({ ...acc, [key]: '' }), {}));
    setIsAddingParticipant(false);
  };

  const handleEditParticipantSubmit = (e) => {
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

  const startEdit = (player) => {
    setEditingParticipantId(player.id);
    setNewPlayerName(player.name);
    setNewPlayerAvatar(player.avatar || '👤');
    setNewPlayerPicks(player.picks);
  };

  const deleteParticipant = (id) => {
    if (window.confirm('Are you sure you want to remove this participant?')) {
      setParticipants(participants.filter((p) => p.id !== id));
    }
  };

  const standings = getStandings();

  return (
    <div className="app-container">
      <header>
        <div className="brand">
          <h1 className="gradient-text-blue">MSI 2026 Pick'em Tracker</h1>
          <p>Real-time tournament tracking and leaderboards sourced from Games of Legends</p>
        </div>
        <div className="tabs">
          <button 
            className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <Flame size={18} /> Dashboard
          </button>
          <button 
            className={`tab-btn ${activeTab === 'leaderboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('leaderboard')}
          >
            <Trophy size={18} /> Standings
          </button>
          <button 
            className={`tab-btn ${activeTab === 'matches' ? 'active' : ''}`}
            onClick={() => setActiveTab('matches')}
          >
            <Calendar size={18} /> Matches ({data.gamesCount || 0})
          </button>
        </div>
      </header>

      {/* Main Content */}
      {activeTab === 'dashboard' && (
        <div>
          {/* Quick Standings Summary Banner */}
          <div className="glass" style={{ borderRadius: '16px', padding: '1.25rem', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Award className="gradient-text-gold" size={24} />
              <div>
                <h4 style={{ fontWeight: 600 }}>Pick'em Leaders</h4>
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

          {/* Cards Grid */}
          <div className="cards-grid">
            {CATEGORY_KEYS.map((key) => {
              const info = CATEGORIES_INFO[key];
              const stat = data.stats?.[key] || { leader: 'No Stats Yet', value: 'N/A' };
              const isChamp = info.type === 'champion';

              return (
                <div 
                  key={key} 
                  className="pickem-card glass"
                  onClick={() => setActiveCategory(key)}
                >
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
                    <div className="leader-name-overlay">
                      {stat.leader}
                    </div>
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
          {/* Side panel standings */}
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
                    <button 
                      onClick={() => startEdit(player)} 
                      style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                    >
                      <Edit size={14} />
                    </button>
                    <button 
                      onClick={() => deleteParticipant(player.id)} 
                      style={{ background: 'transparent', border: 'none', color: 'var(--color-red)', cursor: 'pointer' }}
                    >
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

          {/* Detailed picks comparison grid */}
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
                const hasQualified = isWinrateCat && lb.some(item => item.qualified === true);
                
                let leader, leaderVal;
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
            [...data.games].reverse().map((game) => (
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

      {/* Detail Modal */}
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
                const hasQualified = isWinrateCat && lb.some(item => item.qualified === true);
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

              {/* Bar Comparison Chart */}
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
                                  onError={(e) => e.target.style.display = 'none'}
                                />
                              )}
                              {CATEGORIES_INFO[activeCategory].type === 'player' && getPlayerImage(item.name) && (
                                <img 
                                  src={getPlayerImage(item.name)} 
                                  alt="" 
                                  style={{ width: '20px', height: '20px', borderRadius: '50%', objectFit: 'cover', objectPosition: 'top' }}
                                  onError={(e) => e.target.style.display = 'none'}
                                />
                              )}
                              {CATEGORIES_INFO[activeCategory].type === 'team' && getTeamLogo(item.name) && (
                                <img 
                                  src={getTeamLogo(item.name)} 
                                  alt="" 
                                  style={{ width: '20px', height: '20px', objectFit: 'contain' }}
                                  onError={(e) => e.target.style.display = 'none'}
                                />
                              )}
                              <span className="chart-item-name">{item.name}</span>
                              <div className="chart-item-badges">
                                {item.isTop3 && (
                                  <span className="chart-badge chart-badge-leader">
                                    #{item.rank} Leader
                                  </span>
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
                                  <span className="chart-badge chart-badge-pick">
                                    Picked
                                  </span>
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
                              {item.pickedBy.map((p) => (
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
                  const warnings = [];
                  if (activeCategory === 'category2' || activeCategory === 'category3') {
                    const checkedChamps = new Set();
                    participants.forEach(p => {
                      const pick = p.picks[activeCategory];
                      if (pick && !checkedChamps.has(pick.toLowerCase())) {
                        checkedChamps.add(pick.toLowerCase());
                        
                        // Count actual picks in games
                        let actualPicksCount = 0;
                        if (data.games) {
                          data.games.forEach(g => {
                            g.players.forEach(pl => {
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
                        fontSize: '0.85rem'
                      }}
                    >
                      <AlertCircle size={16} style={{ color: '#ffb300', flexShrink: 0 }} />
                      <span style={{ color: 'var(--text-secondary)' }}>{warning}</span>
                    </div>
                  ));
                })()}
              </div>

              {/* Leaderboard Table */}
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
                      {data.stats[activeCategory].leaderboard.map((item, index) => {
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
                                           item.duration !== undefined ? `${item.duration}` :
                                           item;
                        
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
                                    onError={(e) => e.target.style.display = 'none'}
                                  />
                                )}
                                {CATEGORIES_INFO[activeCategory].type === 'player' && getPlayerImage(name) && (
                                  <img 
                                    src={getPlayerImage(name)} 
                                    alt={name} 
                                    style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', objectPosition: 'top' }}
                                    onError={(e) => e.target.style.display = 'none'}
                                  />
                                )}
                                {CATEGORIES_INFO[activeCategory].type === 'team' && getTeamLogo(name) && (
                                  <img 
                                    src={getTeamLogo(name)} 
                                    alt={name} 
                                    style={{ width: '32px', height: '32px', objectFit: 'contain' }}
                                    onError={(e) => e.target.style.display = 'none'}
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

      {/* Add / Edit Participant Modal */}
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
                
                <div className="editor-grid">
                  {CATEGORY_KEYS.map((key) => {
                    const info = CATEGORIES_INFO[key];
                    return (
                      <div key={key} className="form-group">
                        <label title={info.desc}>{info.label} ({info.pts} pts)</label>
                        <input 
                          type="text" 
                          className="form-control" 
                          value={newPlayerPicks[key]} 
                          onChange={(e) => setNewPlayerPicks({ ...newPlayerPicks, [key]: e.target.value })}
                          placeholder={`Your pick (e.g. ${info.title})`}
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

      {/* Footer Info */}
      <div className="footer-bar">
        <div>
          <span>MSI 2026 Mid-Season Invitational • </span>
          <span>Source of Truth: <a href="https://gol.gg/esports/home/" target="_blank" style={{ color: 'var(--color-blue)', textDecoration: 'none' }}>gol.gg</a></span>
        </div>
        
        <div className="refresh-panel">
          <RefreshCw size={18} />
          <div className="refresh-text">
            <p>Data Status</p>
            <p>Last Scraped: {new Date(data.lastUpdated).toLocaleString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
