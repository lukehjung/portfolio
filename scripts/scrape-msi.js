import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ROOT = path.join(__dirname, '..');
const CACHE_DIR = path.join(PROJECT_ROOT, '.scrape-cache');
const OUTPUT_FILE = path.join(PROJECT_ROOT, 'app', 'pickems', 'msi_data.json');

if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

// Helper to delay requests
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Custom fetch with User-Agent
async function fetchPage(url) {
  const cacheKey = encodeURIComponent(url.replace('https://', '').replace(/\//g, '_')) + '.html';
  const cachePath = path.join(CACHE_DIR, cacheKey);

  // Check cache
  if (fs.existsSync(cachePath)) {
    console.log(`[Cache Hit] ${url}`);
    return fs.readFileSync(cachePath, 'utf-8');
  }

  console.log(`[Fetching] ${url}`);
  await delay(1500); // Respectful crawl delay

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      }
    });

    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }

    const html = await res.text();
    fs.writeFileSync(cachePath, html, 'utf-8');
    return html;
  } catch (err) {
    console.error(`Failed to fetch ${url}:`, err);
    throw err;
  }
}

// Cheerio import (dynamic import or standard)
import * as cheerio from 'cheerio';

async function fetchLolesportsData() {
  const cachePath = path.join(CACHE_DIR, 'lolesports_api.json');
  let data;

  if (fs.existsSync(cachePath)) {
    console.log('[Cache Hit] lolesports api');
    data = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
  } else {
    console.log('[Fetching] lolesports api...');
    try {
      const res = await fetch('https://esports-api.lolesports.com/persisted/gw/getTeams?hl=en-US', {
        headers: {
          'x-api-key': '0TvQnueqKa5mxJntVWt0w4LpLfEkrV1Ta8rQBb9Z'
        }
      });
      if (res.ok) {
        data = await res.json();
        fs.writeFileSync(cachePath, JSON.stringify(data, null, 2), 'utf-8');
      } else {
        console.error('Failed to fetch from lolesports API');
        return { playerImages: {}, teamImages: {} };
      }
    } catch (err) {
      console.error('Error fetching lolesports API:', err);
      return { playerImages: {}, teamImages: {} };
    }
  }

  const playerImages = {};
  const teamImages = {};
  const teamRosters = {};

  const rawTeams = data?.data?.teams || [];
  rawTeams.forEach((t) => {
    if (!t.name) return;
    const teamName = t.name.toLowerCase();
    const teamCode = t.code ? t.code.toLowerCase() : '';
    const roster = Array.isArray(t.players)
      ? t.players.map((p) => p.summonerName).filter(Boolean)
      : [];

    teamRosters[teamName] = roster;
    if (teamCode) teamRosters[teamCode] = roster;

    if (t.image) {
      teamImages[teamName] = t.image;
      if (teamCode) teamImages[teamCode] = t.image;
      if (t.code === 'TL') {
        teamImages['team liquid'] = t.image;
        teamImages['tlaw'] = t.image;
        teamRosters['team liquid'] = roster;
        teamRosters['tlaw'] = roster;
      }
      if (t.code === 'KC') {
        teamImages['karmine corp'] = t.image;
        teamRosters['karmine corp'] = roster;
      }
      if (t.code === 'DCG') {
        teamImages['deep cross gaming'] = t.image;
        teamRosters['deep cross gaming'] = roster;
      }
    }

    if (t.players && Array.isArray(t.players)) {
      t.players.forEach((p) => {
        if (p.image && p.summonerName) {
          playerImages[p.summonerName.toLowerCase()] = p.image;
        }
      });
    }
  });

  return { playerImages, teamImages, teamRosters };
}

async function parseMatchList() {
  const url = 'https://gol.gg/tournament/tournament-matchlist/MSI%202026/';
  const html = await fetchPage(url);
  const $ = cheerio.load(html);
  const matches = [];

  // Match list is inside a table
  $('table tbody tr').each((i, el) => {
    const cols = $(el).find('td');
    if (cols.length < 7) return;

    const linkEl = cols.eq(0).find('a');
    const href = linkEl.attr('href');
    if (!href) return;

    // e.g. ../game/stats/79534/page-summary/ or page-preview/
    const matchIdMatch = href.match(/game\/stats\/(\d+)\//);
    if (!matchIdMatch) return;
    const matchId = matchIdMatch[1];

    const team1 = cols.eq(1).text().trim();
    const score = cols.eq(2).text().trim();
    const team2 = cols.eq(3).text().trim();
    const stage = cols.eq(4).text().trim();
    const date = cols.eq(6).text().trim();

    const isCompleted = score !== '-' && score !== '';

    matches.push({
      matchId,
      team1,
      team2,
      score,
      stage,
      date,
      href: href.replace(/^\.\.\//, 'https://gol.gg/'),
      isCompleted
    });
  });

  return matches;
}

async function parseMatchGames(match) {
  const html = await fetchPage(match.href);
  const $ = cheerio.load(html);
  const gameIds = [];

  // Look at sub-navigation to find game links (e.g. page-game)
  $('nav.gamemenu a').each((i, el) => {
    const href = $(el).attr('href');
    if (href && href.includes('/page-game/')) {
      const idMatch = href.match(/game\/stats\/(\d+)\//);
      if (idMatch) {
        const id = idMatch[1];
        if (!gameIds.includes(id)) {
          gameIds.push(id);
        }
      }
    }
  });

  // Fallback if Bo1 (no sub-navigation list)
  if (gameIds.length === 0) {
    gameIds.push(match.matchId);
  }

  return gameIds;
}

async function parseGameDetails(gameId, stage, date) {
  const gameUrl = `https://gol.gg/game/stats/${gameId}/page-game/`;
  const timelineUrl = `https://gol.gg/game/stats/${gameId}/page-timeline/`;

  const gameHtml = await fetchPage(gameUrl);
  const timelineHtml = await fetchPage(timelineUrl);

  const $g = cheerio.load(gameHtml);
  const $t = cheerio.load(timelineHtml);

  // 1. Duration
  let duration = '00:00';
  $g('h1').each((i, el) => {
    const txt = $g(el).text().trim();
    if (/^\d{2}:\d{2}$/.test(txt)) {
      duration = txt;
    }
  });

  const durationParts = duration.split(':');
  const durationSeconds = parseInt(durationParts[0]) * 60 + parseInt(durationParts[1]);

  // 2. Teams and Headers
  const teams = [];
  $g('div.col-12.col-sm-6').each((i, el) => {
    const isBlue = i === 0;
    const headerClass = isBlue ? '.blue-line-header' : '.red-line-header';
    const teamNameEl = $g(el).find(`${headerClass} a`);
    if (teamNameEl.length === 0) return;

    const teamName = teamNameEl.text().trim();
    const resultText = $g(el).find(headerClass).text();
    const isWinner = resultText.includes('WIN');

    // Kills, Towers, Dragons, Barons, Gold
    const killsEl = $g(el).find('span.score-box').eq(0);
    const kills = parseInt(killsEl.text().replace(/\D/g, '')) || 0;

    const goldEl = $g(el).find('span.score-box').eq(4);
    const goldText = goldEl.text().trim();

    // Bans
    const bans = [];
    $g(el).find('div.row').each((j, row) => {
      const label = $g(row).children('.col-2').text().trim();
      if (label.includes('Bans')) {
        $g(row).find('img').each((k, img) => {
          const banChampion = $g(img).attr('alt');
          if (banChampion && banChampion !== 'First Pick' && banChampion !== 'First Tower' && banChampion !== 'First Blood') {
            bans.push(banChampion);
          }
        });
      }
    });

    // Picks
    const picks = [];
    $g(el).find('div.row').each((j, row) => {
      const label = $g(row).children('.col-2').text().trim();
      if (label.includes('Picks')) {
        $g(row).find('img').each((k, img) => {
          const pickChampion = $g(img).attr('alt');
          if (pickChampion && pickChampion !== 'First Pick' && pickChampion !== 'First Tower' && pickChampion !== 'First Blood') {
            picks.push(pickChampion);
          }
        });
      }
    });

    teams.push({
      teamName,
      isBlue,
      isWinner,
      kills,
      goldText,
      bans,
      picks
    });
  });

  if (teams.length < 2) {
    console.warn(`Could not parse teams for game ${gameId}`);
    return null;
  }

  const blueTeam = teams[0].isBlue ? teams[0] : teams[1];
  const redTeam = teams[0].isBlue ? teams[1] : teams[0];

  // 3. Player Stats & Damage
  // Parse damage first from script
  let blueDmg = [0, 0, 0, 0, 0];
  let redDmg = [0, 0, 0, 0, 0];

  const scripts = [];
  $g('script').each((i, el) => {
    scripts.push($g(el).text());
  });

  const allScriptText = scripts.join('\n');
  const idx = allScriptText.indexOf('blueDmgData');
  if (idx !== -1) {
    const block = allScriptText.substring(idx, idx + 2000);
    const dataArrays = [...block.matchAll(/data:\s*\[([\d.,\s]+)\]/g)];
    if (dataArrays.length >= 2) {
      blueDmg = dataArrays[0][1].split(',').map((n) => Math.round(parseFloat(n.trim()) * 1000));
      redDmg = dataArrays[1][1].split(',').map((n) => Math.round(parseFloat(n.trim()) * 1000));
    }
  }

  const players = [];

  // Parse Player rows (left table = blue, right table = red)
  $g('table.playersInfosLine').each((tableIdx, tableEl) => {
    const isBlue = tableIdx === 0;
    const teamName = isBlue ? blueTeam.teamName : redTeam.teamName;
    const dmgArray = isBlue ? blueDmg : redDmg;
    let playerCount = 0;

    $g(tableEl).find('tbody tr').each((rowIdx, rowEl) => {
      const cols = $g(rowEl).find('td');
      if (cols.length < 4) return;

      const playerLink = cols.eq(0).find('a.link-blanc');
      const playerName = playerLink.text().trim();
      if (!playerName) return;

      const champImg = cols.eq(0).find('img.champion_icon');
      const champion = champImg.attr('alt') || 'Unknown';

      const kdaText = cols.eq(cols.length - 2).text().trim(); // K/D/A
      const csText = cols.eq(cols.length - 1).text().trim(); // CS

      const [kills, deaths, assists] = kdaText.split('/').map((n) => parseInt(n) || 0);
      const cs = parseInt(csText) || 0;

      // Role in order
      const roles = ['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT'];
      const role = roles[playerCount] || 'UNKNOWN';
      const damage = dmgArray[playerCount] || 0;

      players.push({
        name: playerName,
        team: teamName,
        champion,
        role,
        kills,
        deaths,
        assists,
        cs,
        damage,
        isBlue
      });

      playerCount++;
    });
  });

  // 4. Timeline (First Blood and Elder Dragons)
  let firstBloodKiller = 'Unknown';
  let blueElderDragons = 0;
  let redElderDragons = 0;

  let killsFound = false;

  $t('table.timeline tr').each((i, el) => {
    const cols = $t(el).find('td');
    if (cols.length < 7) return;

    const time = cols.eq(0).text().trim();
    const sideImg = cols.eq(1).find('img');
    const isBlue = sideImg.attr('src')?.includes('blueside') || false;
    const player = cols.eq(2).text().trim();
    const actionImg = cols.eq(4).find('img');
    const actionSrc = actionImg.attr('src') || '';
    const actionAlt = actionImg.attr('alt') || '';
    const target = cols.eq(6).text().trim();

    // Check First Blood (first kill event)
    if ((actionSrc.includes('kill-icon') || actionAlt.toLowerCase().includes('kill')) && !killsFound) {
      firstBloodKiller = player || 'Unknown';
      killsFound = true;
    }

    // Check Elder Dragon secure
    if (actionSrc.includes('elder') || actionAlt.toLowerCase().includes('elder')) {
      if (isBlue) {
        blueElderDragons++;
      } else {
        redElderDragons++;
      }
    }
  });

  const isPlayIn = stage.toLowerCase().includes('play-in') || stage.toLowerCase().includes('playin');

  return {
    gameId,
    stage,
    isPlayIn,
    date,
    duration,
    durationSeconds,
    blueTeam: blueTeam.teamName,
    redTeam: redTeam.teamName,
    winner: blueTeam.isWinner ? blueTeam.teamName : redTeam.teamName,
    blueKills: blueTeam.kills,
    redKills: redTeam.kills,
    blueBans: blueTeam.bans,
    redBans: redTeam.bans,
    bluePicks: blueTeam.picks,
    redPicks: redTeam.picks,
    players,
    firstBloodKiller,
    blueElderDragons,
    redElderDragons
  };
}

async function run() {
  console.log('Starting MSI 2026 Pick\'em scraper...');
  try {
    // Fetch latest Riot patch version dynamically
    let latestVersion = '15.1.1'; // Fallback
    try {
      console.log('Fetching latest Riot Data Dragon version...');
      const versionRes = await fetch('https://ddragon.leagueoflegends.com/api/versions.json');
      if (versionRes.ok) {
        const versions = await versionRes.json();
        if (versions && versions.length > 0) {
          latestVersion = versions[0];
          console.log(`Latest patch version: ${latestVersion}`);
        }
      }
    } catch (vErr) {
      console.warn('Could not fetch Data Dragon versions, using fallback.', vErr);
    }

    // Fetch player and team headshot/logo assets from Lolesports API
    const { playerImages, teamImages, teamRosters } = await fetchLolesportsData();

    const matches = await parseMatchList();
    console.log(`Found ${matches.length} matches in tournament matchlist.`);

    // Build the list of teams + players participating in MSI from the full matchlist
    // (not just completed games), so pickem dropdowns include teams that haven't played yet.
    const participatingTeams = new Set();
    matches.forEach((m) => {
      if (m.team1) participatingTeams.add(m.team1);
      if (m.team2) participatingTeams.add(m.team2);
    });

    const lookupRoster = (teamName) => {
      if (!teamName) return [];
      const lower = teamName.toLowerCase().trim();
      if (teamRosters[lower]) return teamRosters[lower];
      // Try suffix / prefix matches (gol.gg sometimes truncates or abbreviates names)
      const hit = Object.keys(teamRosters).find(
        (k) => k.includes(lower) || lower.includes(k)
      );
      return hit ? teamRosters[hit] : [];
    };

    const teamsList = Array.from(participatingTeams).sort((a, b) => a.localeCompare(b));
    const playersSet = new Set();
    teamsList.forEach((team) => {
      lookupRoster(team).forEach((name) => {
        if (name) playersSet.add(name);
      });
    });
    const playersList = Array.from(playersSet).sort((a, b) => a.localeCompare(b));
    console.log(`MSI roster: ${teamsList.length} teams, ${playersList.length} players.`);

    const completedMatches = matches.filter((m) => m.isCompleted);
    console.log(`Processing ${completedMatches.length} completed matches...`);

    const games = [];

    for (const match of completedMatches) {
      console.log(`Processing Match: ${match.team1} vs ${match.team2} (${match.score})`);
      try {
        const gameIds = await parseMatchGames(match);
        console.log(`Match has ${gameIds.length} games: ${gameIds.join(', ')}`);

        for (const gameId of gameIds) {
          console.log(`  Parsing Game ID: ${gameId}`);
          const gameDetails = await parseGameDetails(gameId, match.stage, match.date);
          if (gameDetails) {
            games.push(gameDetails);
          }
        }
      } catch (err) {
        console.error(`Error parsing match ${match.matchId}:`, err);
      }
    }

    console.log(`Successfully parsed ${games.length} games. Compiling statistics...`);

    // Compile Leaderboards
    const stats = compileStats(games);

    // Write output
    const outputData = {
      lastUpdated: new Date().toISOString(),
      patchVersion: latestVersion,
      playerImages,
      teamImages,
      msiTeams: teamsList,
      msiPlayers: playersList,
      gamesCount: games.length,
      games,
      stats
    };

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(outputData, null, 2), 'utf-8');
    console.log(`MSI 2026 data successfully written to ${OUTPUT_FILE}`);
  } catch (err) {
    console.error('Fatal error during scrape:', err);
  }
}

function compileStats(games) {
  const playInGames = games.filter((g) => g.isPlayIn);

  // Helper counters
  const champPicksPlayIn = {};
  const champBansTotal = {};
  const champWinsTotal = {};
  const champPicksTotal = {};
  const champKillsTotal = {};

  const playerKillsTotal = {};
  const playerDeathsTotal = {};
  const playerAssistsTotal = {};
  const playerGamesPlayIn = {};
  const playerGamesTotal = {};
  const playerCsSingleGame = [];
  const playerFbTotal = {};
  const playerDmgTotal = {};

  const teamShortestWinPlayIn = [];
  const teamElderDragons = {};
  const teamLeastKillsSingleGame = [];
  const teamUniqueChamps = {};

  const gameKillsPlayIn = [];
  const uniqueChampsPickedTotal = new Set();

  games.forEach((game) => {
    const isPlayIn = game.isPlayIn;

    // Team unique champs pool setup
    if (!teamUniqueChamps[game.blueTeam]) teamUniqueChamps[game.blueTeam] = new Set();
    if (!teamUniqueChamps[game.redTeam]) teamUniqueChamps[game.redTeam] = new Set();

    // Shortest Win Play-ins
    if (isPlayIn) {
      teamShortestWinPlayIn.push({
        team: game.winner,
        duration: game.duration,
        seconds: game.durationSeconds,
        opponent: game.winner === game.blueTeam ? game.redTeam : game.blueTeam,
        gameId: game.gameId
      });

      // Total kills in single game
      gameKillsPlayIn.push({
        gameId: game.gameId,
        match: `${game.blueTeam} vs ${game.redTeam}`,
        kills: game.blueKills + game.redKills,
        blueKills: game.blueKills,
        redKills: game.redKills
      });
    }

    // Elder Dragons
    if (!teamElderDragons[game.blueTeam]) teamElderDragons[game.blueTeam] = 0;
    if (!teamElderDragons[game.redTeam]) teamElderDragons[game.redTeam] = 0;
    teamElderDragons[game.blueTeam] += game.blueElderDragons;
    teamElderDragons[game.redTeam] += game.redElderDragons;

    // Least kills in single game
    teamLeastKillsSingleGame.push({
      team: game.blueTeam,
      opponent: game.redTeam,
      kills: game.blueKills,
      gameId: game.gameId
    });
    teamLeastKillsSingleGame.push({
      team: game.redTeam,
      opponent: game.blueTeam,
      kills: game.redKills,
      gameId: game.gameId
    });

    // Bans
    const allBans = [...game.blueBans, ...game.redBans];
    allBans.forEach((champ) => {
      champBansTotal[champ] = (champBansTotal[champ] || 0) + 1;
    });

    // Picks
    const allPicks = [...game.bluePicks, ...game.redPicks];
    allPicks.forEach((champ) => {
      uniqueChampsPickedTotal.add(champ);
      champPicksTotal[champ] = (champPicksTotal[champ] || 0) + 1;
      if (isPlayIn) {
        champPicksPlayIn[champ] = (champPicksPlayIn[champ] || 0) + 1;
      }
    });

    // Winner Picks for Winrate
    const winnerPicks = game.winner === game.blueTeam ? game.bluePicks : game.redPicks;
    winnerPicks.forEach((champ) => {
      champWinsTotal[champ] = (champWinsTotal[champ] || 0) + 1;
    });

    // Player stats
    game.players.forEach((p) => {
      uniqueChampsPickedTotal.add(p.champion);

      // Add to team champion pool
      teamUniqueChamps[p.team].add(p.champion);

      // Cs single game
      playerCsSingleGame.push({
        player: p.name,
        team: p.team,
        champion: p.champion,
        cs: p.cs,
        gameId: game.gameId,
        match: `${game.blueTeam} vs ${game.redTeam}`
      });

      // Accumulate champion kills
      champKillsTotal[p.champion] = (champKillsTotal[p.champion] || 0) + p.kills;

      // Accumulate player kills
      if (isPlayIn) {
        playerKillsTotal[p.name] = (playerKillsTotal[p.name] || 0) + p.kills;
        playerDeathsTotal[p.name] = (playerDeathsTotal[p.name] || 0) + p.deaths;
        playerAssistsTotal[p.name] = (playerAssistsTotal[p.name] || 0) + p.assists;
        playerGamesPlayIn[p.name] = (playerGamesPlayIn[p.name] || 0) + 1;
      }

      playerGamesTotal[p.name] = (playerGamesTotal[p.name] || 0) + 1;
      const gameDurationMinutes = game.durationSeconds / 60;
      const playerDpm = gameDurationMinutes > 0 ? p.damage / gameDurationMinutes : 0;
      playerDmgTotal[p.name] = (playerDmgTotal[p.name] || 0) + playerDpm;
    });

    // First Blood player tracking
    if (game.firstBloodKiller && game.firstBloodKiller !== 'Unknown') {
      playerFbTotal[game.firstBloodKiller] = (playerFbTotal[game.firstBloodKiller] || 0) + 1;
    }
  });

  // Calculate Winrates (Tournament wide, min 5 games)
  const winrates = Object.keys(champPicksTotal).map((champ) => {
    const picks = champPicksTotal[champ] || 0;
    const wins = champWinsTotal[champ] || 0;
    const wr = picks > 0 ? wins / picks : 0;
    return { champion: champ, winrate: wr, picks, wins };
  });

  const winratesMin5 = winrates.filter((w) => w.picks >= 5);

  // 1. Vi: Play-In Picks Leaderboard
  const viLeaderboard = Object.keys(champPicksPlayIn)
    .map((champ) => ({ champion: champ, count: champPicksPlayIn[champ] }))
    .sort((a, b) => b.count - a.count);

  // 2. Ashe: Highest Winrate (Min 5 games to qualify, but show all with qualified flag)
  const asheLeaderboard = [...winrates]
    .filter(w => w.picks > 0)
    .map(w => ({ ...w, qualified: w.picks >= 5 }))
    .sort((a, b) => {
      // Qualified champions sort first
      if (a.qualified !== b.qualified) return a.qualified ? -1 : 1;
      // Then by winrate descending
      if (b.winrate !== a.winrate) return b.winrate - a.winrate;
      // Then by picks descending as tiebreaker
      return b.picks - a.picks;
    });

  // 3. JarvanIV: Lowest Winrate (Min 5 games to qualify, but show all with qualified flag)
  const jarvanLeaderboard = [...winrates]
    .filter(w => w.picks > 0)
    .map(w => ({ ...w, qualified: w.picks >= 5 }))
    .sort((a, b) => {
      // Qualified champions sort first
      if (a.qualified !== b.qualified) return a.qualified ? -1 : 1;
      // Then by winrate ascending (lowest first)
      if (a.winrate !== b.winrate) return a.winrate - b.winrate;
      // Then by picks descending as tiebreaker
      return b.picks - a.picks;
    });

  // 4. Ezreal: Champion with Most Kills
  const ezrealLeaderboard = Object.keys(champKillsTotal)
    .map((champ) => ({ champion: champ, kills: champKillsTotal[champ] }))
    .sort((a, b) => b.kills - a.kills);

  // 5. Keria: Play-In KDA Leaderboard
  const keriaLeaderboard = Object.keys(playerGamesPlayIn)
    .map((name) => {
      const kills = playerKillsTotal[name] || 0;
      const deaths = playerDeathsTotal[name] || 0;
      const assists = playerAssistsTotal[name] || 0;
      const games = playerGamesPlayIn[name] || 0;

      // sorting KDA: if deaths == 0, count as perfect, value = (kills+assists)/0.5
      const kda = deaths === 0 ? (kills + assists) / 0.5 : (kills + assists) / deaths;
      return {
        player: name,
        kills,
        deaths,
        assists,
        games,
        kda,
        kdaFormatted: deaths === 0 ? 'Perfect' : kda.toFixed(2)
      };
    })
    .sort((a, b) => b.kda - a.kda);

  // 6. Viper: Highest CS Single Game
  const viperLeaderboard = playerCsSingleGame.sort((a, b) => b.cs - a.cs);

  // 7. Oner: Most First Bloods
  const onerLeaderboard = Object.keys(playerFbTotal)
    .map((name) => ({ player: name, fbCount: playerFbTotal[name] }))
    .sort((a, b) => b.fbCount - a.fbCount);

  // 8. Peyz: Highest Average DPM (Damage Per Minute)
  const peyzLeaderboard = Object.keys(playerGamesTotal)
    .map((name) => {
      const totalDpm = playerDmgTotal[name] || 0;
      const games = playerGamesTotal[name] || 0;
      const avgDpm = games > 0 ? totalDpm / games : 0;
      return { player: name, avgDmg: Math.round(avgDpm), games };
    })
    .sort((a, b) => b.avgDmg - a.avgDmg);

  // 9. T1: Play-In Shortest Winning Game
  const t1Leaderboard = teamShortestWinPlayIn.sort((a, b) => a.seconds - b.seconds);

  // 10. T1: Most Elder Dragon Kills
  const teamElderLeaderboard = Object.keys(teamElderDragons)
    .map((team) => ({ team, elderDragons: teamElderDragons[team] }))
    .sort((a, b) => b.elderDragons - a.elderDragons);

  // 11. FURIA: Least Kills in Single Game
  const furiaLeaderboard = teamLeastKillsSingleGame.sort((a, b) => a.kills - b.kills);

  // 12. T1: Largest unique champion pool played
  const teamPoolLeaderboard = Object.keys(teamUniqueChamps)
    .map((team) => ({ team, uniqueCount: teamUniqueChamps[team].size, champions: Array.from(teamUniqueChamps[team]) }))
    .sort((a, b) => b.uniqueCount - a.uniqueCount);

  // 13. 31-45: Highest kills in single game (Play-in)
  const killsSingleGameLeaderboard = gameKillsPlayIn.sort((a, b) => b.kills - a.kills);

  // 14. 105-109: How many unique champions picked
  const totalUniquePickedCount = uniqueChampsPickedTotal.size;

  // 15. Will Teemo be picked
  const isTeemoPicked = uniqueChampsPickedTotal.has('Teemo');

  // 16. Bard: Banned the most
  const bardLeaderboard = Object.keys(champBansTotal)
    .map((champ) => ({ champion: champ, bans: champBansTotal[champ] }))
    .sort((a, b) => b.bans - a.bans);

  return {
    category1: {
      title: 'Champion Picked Most (Play-ins)',
      leader: viLeaderboard[0]?.champion || 'N/A',
      value: viLeaderboard[0] ? `${viLeaderboard[0].count} picks` : '0 picks',
      leaderboard: viLeaderboard
    },
    category2: {
      title: 'Highest Winrate Champion (Min 5 games)',
      leader: asheLeaderboard[0]?.champion || 'N/A',
      value: asheLeaderboard[0] ? `${(asheLeaderboard[0].winrate * 100).toFixed(1)}% (${asheLeaderboard[0].wins}/${asheLeaderboard[0].picks})` : '0%',
      leaderboard: asheLeaderboard
    },
    category3: {
      title: 'Lowest Winrate Champion (Min 5 games)',
      leader: jarvanLeaderboard[0]?.champion || 'N/A',
      value: jarvanLeaderboard[0] ? `${(jarvanLeaderboard[0].winrate * 100).toFixed(1)}% (${jarvanLeaderboard[0].wins}/${jarvanLeaderboard[0].picks})` : '0%',
      leaderboard: jarvanLeaderboard
    },
    category4: {
      title: 'Champion with Most Kills',
      leader: ezrealLeaderboard[0]?.champion || 'N/A',
      value: ezrealLeaderboard[0] ? `${ezrealLeaderboard[0].kills} kills` : '0 kills',
      leaderboard: ezrealLeaderboard
    },
    category5: {
      title: 'Pro with Highest KDA (Play-ins)',
      leader: keriaLeaderboard[0]?.player || 'N/A',
      value: keriaLeaderboard[0] ? `${keriaLeaderboard[0].kdaFormatted} KDA (${keriaLeaderboard[0].kills}/${keriaLeaderboard[0].deaths}/${keriaLeaderboard[0].assists})` : 'N/A',
      leaderboard: keriaLeaderboard
    },
    category6: {
      title: 'Pro with Highest CS in Single Game',
      leader: viperLeaderboard[0]?.player || 'N/A',
      value: viperLeaderboard[0] ? `${viperLeaderboard[0].cs} CS (${viperLeaderboard[0].champion} in ${viperLeaderboard[0].match})` : '0 CS',
      leaderboard: viperLeaderboard
    },
    category7: {
      title: 'Pro with Most First Bloods',
      leader: onerLeaderboard[0]?.player || 'N/A',
      value: onerLeaderboard[0] ? `${onerLeaderboard[0].fbCount} First Bloods` : '0 FB',
      leaderboard: onerLeaderboard
    },
    category8: {
      title: 'Pro with Highest Average DPM',
      leader: peyzLeaderboard[0]?.player || 'N/A',
      value: peyzLeaderboard[0] ? `${peyzLeaderboard[0].avgDmg} DPM` : '0 DPM',
      leaderboard: peyzLeaderboard
    },
    category9: {
      title: 'Team with Shortest Game Win (Play-ins)',
      leader: t1Leaderboard[0]?.team || 'N/A',
      value: t1Leaderboard[0] ? `${t1Leaderboard[0].duration} (vs ${t1Leaderboard[0].opponent})` : 'N/A',
      leaderboard: t1Leaderboard
    },
    category10: {
      title: 'Team with Most Elder Dragons',
      leader: teamElderLeaderboard[0]?.team || 'N/A',
      value: teamElderLeaderboard[0] ? `${teamElderLeaderboard[0].elderDragons} Elder Dragons` : '0 Elder Dragons',
      leaderboard: teamElderLeaderboard
    },
    category11: {
      title: 'Team with Least Kills in Single Game',
      leader: furiaLeaderboard[0]?.team || 'N/A',
      value: furiaLeaderboard[0] ? `${furiaLeaderboard[0].kills} kills (vs ${furiaLeaderboard[0].opponent})` : 'N/A',
      leaderboard: furiaLeaderboard
    },
    category12: {
      title: 'Team with Most Unique Champions (Champion Pool)',
      leader: teamPoolLeaderboard[0]?.team || 'N/A',
      value: teamPoolLeaderboard[0] ? `${teamPoolLeaderboard[0].uniqueCount} champions` : '0 champions',
      leaderboard: teamPoolLeaderboard
    },
    category13: {
      title: 'Play-ins: Highest Number of Kills in Single Game',
      leader: killsSingleGameLeaderboard[0] ? `${killsSingleGameLeaderboard[0].kills} Kills` : 'N/A',
      value: killsSingleGameLeaderboard[0] ? `${killsSingleGameLeaderboard[0].kills} kills (${killsSingleGameLeaderboard[0].match})` : '0 kills',
      leaderboard: killsSingleGameLeaderboard
    },
    category14: {
      title: 'How many unique champions will be picked?',
      leader: `${totalUniquePickedCount} Champions`,
      value: `${totalUniquePickedCount} unique champions picked`,
      leaderboard: winrates.sort((a, b) => b.picks - a.picks) // top picked overall
    },
    category15: {
      title: 'Will Teemo be picked?',
      leader: isTeemoPicked ? 'Yes' : 'No',
      value: isTeemoPicked ? 'Teemo has been picked!' : 'Teemo has not been picked yet.',
      leaderboard: Array.from(uniqueChampsPickedTotal).sort()
    },
    category16: {
      title: 'Champion Banned Most',
      leader: bardLeaderboard[0]?.champion || 'N/A',
      value: bardLeaderboard[0] ? `${bardLeaderboard[0].bans} bans` : '0 bans',
      leaderboard: bardLeaderboard
    }
  };
}

run();
