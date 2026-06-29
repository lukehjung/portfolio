import * as cheerio from 'cheerio';

const TOURNAMENT_URL = 'https://gol.gg/tournament/tournament-matchlist/MSI%202026/';
const LOLESPORTS_TEAMS_URL = 'https://esports-api.lolesports.com/persisted/gw/getTeams?hl=en-US';
const LOLESPORTS_API_KEY = '0TvQnueqKa5mxJntVWt0w4LpLfEkrV1Ta8rQBb9Z';
const DDRAGON_VERSIONS_URL = 'https://ddragon.leagueoflegends.com/api/versions.json';

const CACHE_KEY_AGGREGATE = 'msi:aggregate';
const CACHE_KEY_LOLESPORTS = 'msi:lolesports';
const CACHE_KEY_PATCH = 'msi:patch';
const CACHE_KEY_MATCHLIST = 'msi:matchlist';
const CACHE_PREFIX_GAME_HTML = 'msi:html:';
const CACHE_PREFIX_GAME_PARSED = 'msi:game:';

const HTML_TTL_SECONDS = 60 * 60 * 24 * 30;
const LOLESPORTS_TTL_SECONDS = 60 * 60 * 24;
const MATCHLIST_TTL_SECONDS = 60 * 5;
const PATCH_TTL_SECONDS = 60 * 60 * 6;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const json = (body, init = {}) =>
  new Response(JSON.stringify(body), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=60',
      ...corsHeaders,
      ...(init.headers || {}),
    },
  });

async function fetchHtml(url, env, { bypassCache = false } = {}) {
  const cacheKey = CACHE_PREFIX_GAME_HTML + url;
  if (!bypassCache) {
    const cached = await env.MSI_CACHE.get(cacheKey);
    if (cached) return cached;
  }
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
    },
    cf: { cacheTtl: 300, cacheEverything: true },
  });
  if (!res.ok) {
    throw new Error(`fetch ${url} -> ${res.status}`);
  }
  const html = await res.text();
  await env.MSI_CACHE.put(cacheKey, html, { expirationTtl: HTML_TTL_SECONDS });
  return html;
}

async function fetchLolesportsImages(env) {
  const cached = await env.MSI_CACHE.get(CACHE_KEY_LOLESPORTS, { type: 'json' });
  if (cached) return cached;

  const res = await fetch(LOLESPORTS_TEAMS_URL, {
    headers: { 'x-api-key': LOLESPORTS_API_KEY },
  });
  if (!res.ok) return { playerImages: {}, teamImages: {} };

  const data = await res.json();
  const playerImages = {};
  const teamImages = {};
  const rawTeams = data?.data?.teams || [];
  for (const t of rawTeams) {
    if (!t.image || !t.name) continue;
    const teamName = t.name.toLowerCase();
    const teamCode = t.code ? t.code.toLowerCase() : '';
    teamImages[teamName] = t.image;
    if (teamCode) teamImages[teamCode] = t.image;

    if (t.code === 'TL') {
      teamImages['team liquid'] = t.image;
      teamImages['tlaw'] = t.image;
    }
    if (t.code === 'KC') teamImages['karmine corp'] = t.image;
    if (t.code === 'DCG') teamImages['deep cross gaming'] = t.image;

    if (Array.isArray(t.players)) {
      for (const p of t.players) {
        if (p.image && p.summonerName) {
          playerImages[p.summonerName.toLowerCase()] = p.image;
        }
      }
    }
  }

  const result = { playerImages, teamImages };
  await env.MSI_CACHE.put(CACHE_KEY_LOLESPORTS, JSON.stringify(result), {
    expirationTtl: LOLESPORTS_TTL_SECONDS,
  });
  return result;
}

async function fetchPatchVersion(env) {
  const cached = await env.MSI_CACHE.get(CACHE_KEY_PATCH);
  if (cached) return cached;
  try {
    const res = await fetch(DDRAGON_VERSIONS_URL);
    if (res.ok) {
      const versions = await res.json();
      if (Array.isArray(versions) && versions.length) {
        await env.MSI_CACHE.put(CACHE_KEY_PATCH, versions[0], { expirationTtl: PATCH_TTL_SECONDS });
        return versions[0];
      }
    }
  } catch {
    // fall through to default
  }
  return '15.1.1';
}

async function parseMatchList(env, { bypassCache = false } = {}) {
  if (!bypassCache) {
    const cached = await env.MSI_CACHE.get(CACHE_KEY_MATCHLIST, { type: 'json' });
    if (cached) return cached;
  }

  const html = await fetchHtml(TOURNAMENT_URL, env, { bypassCache });
  const $ = cheerio.load(html);
  const matches = [];

  $('table tbody tr').each((_, el) => {
    const cols = $(el).find('td');
    if (cols.length < 7) return;
    const linkEl = cols.eq(0).find('a');
    const href = linkEl.attr('href');
    if (!href) return;
    const matchIdMatch = href.match(/game\/stats\/(\d+)\//);
    if (!matchIdMatch) return;

    matches.push({
      matchId: matchIdMatch[1],
      team1: cols.eq(1).text().trim(),
      score: cols.eq(2).text().trim(),
      team2: cols.eq(3).text().trim(),
      stage: cols.eq(4).text().trim(),
      date: cols.eq(6).text().trim(),
      href: href.replace(/^\.\.\//, 'https://gol.gg/'),
      isCompleted: cols.eq(2).text().trim() !== '-' && cols.eq(2).text().trim() !== '',
    });
  });

  await env.MSI_CACHE.put(CACHE_KEY_MATCHLIST, JSON.stringify(matches), {
    expirationTtl: MATCHLIST_TTL_SECONDS,
  });
  return matches;
}

async function parseMatchGameIds(match, env) {
  const html = await fetchHtml(match.href, env);
  const $ = cheerio.load(html);
  const gameIds = [];
  $('nav.gamemenu a').each((_, el) => {
    const href = $(el).attr('href');
    if (href && href.includes('/page-game/')) {
      const idMatch = href.match(/game\/stats\/(\d+)\//);
      if (idMatch && !gameIds.includes(idMatch[1])) gameIds.push(idMatch[1]);
    }
  });
  if (gameIds.length === 0) gameIds.push(match.matchId);
  return gameIds;
}

async function parseGameDetails(gameId, stage, date, env) {
  const gameUrl = `https://gol.gg/game/stats/${gameId}/page-game/`;
  const timelineUrl = `https://gol.gg/game/stats/${gameId}/page-timeline/`;

  const [gameHtml, timelineHtml] = await Promise.all([
    fetchHtml(gameUrl, env),
    fetchHtml(timelineUrl, env),
  ]);

  const $g = cheerio.load(gameHtml);
  const $t = cheerio.load(timelineHtml);

  let duration = '00:00';
  $g('h1').each((_, el) => {
    const txt = $g(el).text().trim();
    if (/^\d{2}:\d{2}$/.test(txt)) duration = txt;
  });
  const [m, s] = duration.split(':');
  const durationSeconds = parseInt(m) * 60 + parseInt(s);

  const teams = [];
  $g('div.col-12.col-sm-6').each((i, el) => {
    const isBlue = i === 0;
    const headerClass = isBlue ? '.blue-line-header' : '.red-line-header';
    const teamNameEl = $g(el).find(`${headerClass} a`);
    if (teamNameEl.length === 0) return;

    const teamName = teamNameEl.text().trim();
    const isWinner = $g(el).find(headerClass).text().includes('WIN');
    const kills = parseInt($g(el).find('span.score-box').eq(0).text().replace(/\D/g, '')) || 0;
    const goldText = $g(el).find('span.score-box').eq(4).text().trim();

    const bans = [];
    const picks = [];
    $g(el).find('div.row').each((__, row) => {
      const label = $g(row).children('.col-2').text().trim();
      const isBansRow = label.includes('Bans');
      const isPicksRow = label.includes('Picks');
      if (!isBansRow && !isPicksRow) return;
      $g(row).find('img').each((___, img) => {
        const alt = $g(img).attr('alt');
        if (!alt || alt === 'First Pick' || alt === 'First Tower' || alt === 'First Blood') return;
        if (isBansRow) bans.push(alt);
        else picks.push(alt);
      });
    });

    teams.push({ teamName, isBlue, isWinner, kills, goldText, bans, picks });
  });

  if (teams.length < 2) return null;
  const blueTeam = teams[0].isBlue ? teams[0] : teams[1];
  const redTeam = teams[0].isBlue ? teams[1] : teams[0];

  let blueDmg = [0, 0, 0, 0, 0];
  let redDmg = [0, 0, 0, 0, 0];
  const allScriptText = $g('script').map((_, el) => $g(el).text()).get().join('\n');
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
  $g('table.playersInfosLine').each((tableIdx, tableEl) => {
    const isBlue = tableIdx === 0;
    const teamName = isBlue ? blueTeam.teamName : redTeam.teamName;
    const dmgArray = isBlue ? blueDmg : redDmg;
    let playerCount = 0;

    $g(tableEl).find('tbody tr').each((_, rowEl) => {
      const cols = $g(rowEl).find('td');
      if (cols.length < 4) return;
      const playerName = cols.eq(0).find('a.link-blanc').text().trim();
      if (!playerName) return;
      const champion = cols.eq(0).find('img.champion_icon').attr('alt') || 'Unknown';
      const kdaText = cols.eq(cols.length - 2).text().trim();
      const csText = cols.eq(cols.length - 1).text().trim();
      const [k, d, a] = kdaText.split('/').map((n) => parseInt(n) || 0);
      const cs = parseInt(csText) || 0;
      const role = ['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT'][playerCount] || 'UNKNOWN';
      const damage = dmgArray[playerCount] || 0;

      players.push({
        name: playerName,
        team: teamName,
        champion,
        role,
        kills: k,
        deaths: d,
        assists: a,
        cs,
        damage,
        isBlue,
      });
      playerCount++;
    });
  });

  let firstBloodKiller = 'Unknown';
  let blueElderDragons = 0;
  let redElderDragons = 0;
  let killsFound = false;
  $t('table.timeline tr').each((_, el) => {
    const cols = $t(el).find('td');
    if (cols.length < 7) return;
    const sideImg = cols.eq(1).find('img');
    const isBlue = sideImg.attr('src')?.includes('blueside') || false;
    const player = cols.eq(2).text().trim();
    const actionImg = cols.eq(4).find('img');
    const actionSrc = actionImg.attr('src') || '';
    const actionAlt = actionImg.attr('alt') || '';

    if ((actionSrc.includes('kill-icon') || actionAlt.toLowerCase().includes('kill')) && !killsFound) {
      firstBloodKiller = player || 'Unknown';
      killsFound = true;
    }
    if (actionSrc.includes('elder') || actionAlt.toLowerCase().includes('elder')) {
      if (isBlue) blueElderDragons++;
      else redElderDragons++;
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
    redElderDragons,
  };
}

function compileStats(games) {
  const playInGames = games.filter((g) => g.isPlayIn);

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

  for (const game of games) {
    const isPlayIn = game.isPlayIn;

    if (!teamUniqueChamps[game.blueTeam]) teamUniqueChamps[game.blueTeam] = new Set();
    if (!teamUniqueChamps[game.redTeam]) teamUniqueChamps[game.redTeam] = new Set();

    if (isPlayIn) {
      teamShortestWinPlayIn.push({
        team: game.winner,
        duration: game.duration,
        seconds: game.durationSeconds,
        opponent: game.winner === game.blueTeam ? game.redTeam : game.blueTeam,
        gameId: game.gameId,
      });
      gameKillsPlayIn.push({
        gameId: game.gameId,
        match: `${game.blueTeam} vs ${game.redTeam}`,
        kills: game.blueKills + game.redKills,
        blueKills: game.blueKills,
        redKills: game.redKills,
      });
    }

    teamElderDragons[game.blueTeam] = (teamElderDragons[game.blueTeam] || 0) + game.blueElderDragons;
    teamElderDragons[game.redTeam] = (teamElderDragons[game.redTeam] || 0) + game.redElderDragons;

    teamLeastKillsSingleGame.push({ team: game.blueTeam, opponent: game.redTeam, kills: game.blueKills, gameId: game.gameId });
    teamLeastKillsSingleGame.push({ team: game.redTeam, opponent: game.blueTeam, kills: game.redKills, gameId: game.gameId });

    for (const champ of [...game.blueBans, ...game.redBans]) {
      champBansTotal[champ] = (champBansTotal[champ] || 0) + 1;
    }
    for (const champ of [...game.bluePicks, ...game.redPicks]) {
      uniqueChampsPickedTotal.add(champ);
      champPicksTotal[champ] = (champPicksTotal[champ] || 0) + 1;
      if (isPlayIn) champPicksPlayIn[champ] = (champPicksPlayIn[champ] || 0) + 1;
    }
    const winnerPicks = game.winner === game.blueTeam ? game.bluePicks : game.redPicks;
    for (const champ of winnerPicks) {
      champWinsTotal[champ] = (champWinsTotal[champ] || 0) + 1;
    }

    for (const p of game.players) {
      uniqueChampsPickedTotal.add(p.champion);
      teamUniqueChamps[p.team].add(p.champion);
      playerCsSingleGame.push({
        player: p.name,
        team: p.team,
        champion: p.champion,
        cs: p.cs,
        gameId: game.gameId,
        match: `${game.blueTeam} vs ${game.redTeam}`,
      });
      champKillsTotal[p.champion] = (champKillsTotal[p.champion] || 0) + p.kills;
      if (isPlayIn) {
        playerKillsTotal[p.name] = (playerKillsTotal[p.name] || 0) + p.kills;
        playerDeathsTotal[p.name] = (playerDeathsTotal[p.name] || 0) + p.deaths;
        playerAssistsTotal[p.name] = (playerAssistsTotal[p.name] || 0) + p.assists;
        playerGamesPlayIn[p.name] = (playerGamesPlayIn[p.name] || 0) + 1;
      }
      playerGamesTotal[p.name] = (playerGamesTotal[p.name] || 0) + 1;
      const mins = game.durationSeconds / 60;
      const dpm = mins > 0 ? p.damage / mins : 0;
      playerDmgTotal[p.name] = (playerDmgTotal[p.name] || 0) + dpm;
    }

    if (game.firstBloodKiller && game.firstBloodKiller !== 'Unknown') {
      playerFbTotal[game.firstBloodKiller] = (playerFbTotal[game.firstBloodKiller] || 0) + 1;
    }
  }

  const winrates = Object.keys(champPicksTotal).map((champ) => {
    const picks = champPicksTotal[champ] || 0;
    const wins = champWinsTotal[champ] || 0;
    return { champion: champ, winrate: picks > 0 ? wins / picks : 0, picks, wins };
  });

  const viLeaderboard = Object.keys(champPicksPlayIn)
    .map((c) => ({ champion: c, count: champPicksPlayIn[c] }))
    .sort((a, b) => b.count - a.count);

  const sortByWinrate = (asc) => (a, b) => {
    if (a.qualified !== b.qualified) return a.qualified ? -1 : 1;
    if (a.winrate !== b.winrate) return asc ? a.winrate - b.winrate : b.winrate - a.winrate;
    return b.picks - a.picks;
  };

  const asheLeaderboard = winrates
    .filter((w) => w.picks > 0)
    .map((w) => ({ ...w, qualified: w.picks >= 5 }))
    .sort(sortByWinrate(false));

  const jarvanLeaderboard = winrates
    .filter((w) => w.picks > 0)
    .map((w) => ({ ...w, qualified: w.picks >= 5 }))
    .sort(sortByWinrate(true));

  const ezrealLeaderboard = Object.keys(champKillsTotal)
    .map((c) => ({ champion: c, kills: champKillsTotal[c] }))
    .sort((a, b) => b.kills - a.kills);

  const keriaLeaderboard = Object.keys(playerGamesPlayIn)
    .map((name) => {
      const kills = playerKillsTotal[name] || 0;
      const deaths = playerDeathsTotal[name] || 0;
      const assists = playerAssistsTotal[name] || 0;
      const games = playerGamesPlayIn[name] || 0;
      const kda = deaths === 0 ? (kills + assists) / 0.5 : (kills + assists) / deaths;
      return {
        player: name,
        kills,
        deaths,
        assists,
        games,
        kda,
        kdaFormatted: deaths === 0 ? 'Perfect' : kda.toFixed(2),
      };
    })
    .sort((a, b) => b.kda - a.kda);

  const viperLeaderboard = playerCsSingleGame.sort((a, b) => b.cs - a.cs);

  const onerLeaderboard = Object.keys(playerFbTotal)
    .map((name) => ({ player: name, fbCount: playerFbTotal[name] }))
    .sort((a, b) => b.fbCount - a.fbCount);

  const peyzLeaderboard = Object.keys(playerGamesTotal)
    .map((name) => {
      const games = playerGamesTotal[name] || 0;
      const avg = games > 0 ? (playerDmgTotal[name] || 0) / games : 0;
      return { player: name, avgDmg: Math.round(avg), games };
    })
    .sort((a, b) => b.avgDmg - a.avgDmg);

  const t1Leaderboard = teamShortestWinPlayIn.sort((a, b) => a.seconds - b.seconds);

  const teamElderLeaderboard = Object.keys(teamElderDragons)
    .map((t) => ({ team: t, elderDragons: teamElderDragons[t] }))
    .sort((a, b) => b.elderDragons - a.elderDragons);

  const furiaLeaderboard = teamLeastKillsSingleGame.sort((a, b) => a.kills - b.kills);

  const teamPoolLeaderboard = Object.keys(teamUniqueChamps)
    .map((t) => ({ team: t, uniqueCount: teamUniqueChamps[t].size, champions: [...teamUniqueChamps[t]] }))
    .sort((a, b) => b.uniqueCount - a.uniqueCount);

  const killsSingleGameLeaderboard = gameKillsPlayIn.sort((a, b) => b.kills - a.kills);
  const totalUniquePickedCount = uniqueChampsPickedTotal.size;
  const isTeemoPicked = uniqueChampsPickedTotal.has('Teemo');

  const bardLeaderboard = Object.keys(champBansTotal)
    .map((c) => ({ champion: c, bans: champBansTotal[c] }))
    .sort((a, b) => b.bans - a.bans);

  return {
    category1: {
      title: 'Champion Picked Most (Play-ins)',
      leader: viLeaderboard[0]?.champion || 'N/A',
      value: viLeaderboard[0] ? `${viLeaderboard[0].count} picks` : '0 picks',
      leaderboard: viLeaderboard,
    },
    category2: {
      title: 'Highest Winrate Champion (Min 5 games)',
      leader: asheLeaderboard[0]?.champion || 'N/A',
      value: asheLeaderboard[0] ? `${(asheLeaderboard[0].winrate * 100).toFixed(1)}% (${asheLeaderboard[0].wins}/${asheLeaderboard[0].picks})` : '0%',
      leaderboard: asheLeaderboard,
    },
    category3: {
      title: 'Lowest Winrate Champion (Min 5 games)',
      leader: jarvanLeaderboard[0]?.champion || 'N/A',
      value: jarvanLeaderboard[0] ? `${(jarvanLeaderboard[0].winrate * 100).toFixed(1)}% (${jarvanLeaderboard[0].wins}/${jarvanLeaderboard[0].picks})` : '0%',
      leaderboard: jarvanLeaderboard,
    },
    category4: {
      title: 'Champion with Most Kills',
      leader: ezrealLeaderboard[0]?.champion || 'N/A',
      value: ezrealLeaderboard[0] ? `${ezrealLeaderboard[0].kills} kills` : '0 kills',
      leaderboard: ezrealLeaderboard,
    },
    category5: {
      title: 'Pro with Highest KDA (Play-ins)',
      leader: keriaLeaderboard[0]?.player || 'N/A',
      value: keriaLeaderboard[0] ? `${keriaLeaderboard[0].kdaFormatted} KDA (${keriaLeaderboard[0].kills}/${keriaLeaderboard[0].deaths}/${keriaLeaderboard[0].assists})` : 'N/A',
      leaderboard: keriaLeaderboard,
    },
    category6: {
      title: 'Pro with Highest CS in Single Game',
      leader: viperLeaderboard[0]?.player || 'N/A',
      value: viperLeaderboard[0] ? `${viperLeaderboard[0].cs} CS (${viperLeaderboard[0].champion} in ${viperLeaderboard[0].match})` : '0 CS',
      leaderboard: viperLeaderboard,
    },
    category7: {
      title: 'Pro with Most First Bloods',
      leader: onerLeaderboard[0]?.player || 'N/A',
      value: onerLeaderboard[0] ? `${onerLeaderboard[0].fbCount} First Bloods` : '0 FB',
      leaderboard: onerLeaderboard,
    },
    category8: {
      title: 'Pro with Highest Average DPM',
      leader: peyzLeaderboard[0]?.player || 'N/A',
      value: peyzLeaderboard[0] ? `${peyzLeaderboard[0].avgDmg} DPM` : '0 DPM',
      leaderboard: peyzLeaderboard,
    },
    category9: {
      title: 'Team with Shortest Game Win (Play-ins)',
      leader: t1Leaderboard[0]?.team || 'N/A',
      value: t1Leaderboard[0] ? `${t1Leaderboard[0].duration} (vs ${t1Leaderboard[0].opponent})` : 'N/A',
      leaderboard: t1Leaderboard,
    },
    category10: {
      title: 'Team with Most Elder Dragons',
      leader: teamElderLeaderboard[0]?.team || 'N/A',
      value: teamElderLeaderboard[0] ? `${teamElderLeaderboard[0].elderDragons} Elder Dragons` : '0 Elder Dragons',
      leaderboard: teamElderLeaderboard,
    },
    category11: {
      title: 'Team with Least Kills in Single Game',
      leader: furiaLeaderboard[0]?.team || 'N/A',
      value: furiaLeaderboard[0] ? `${furiaLeaderboard[0].kills} kills (vs ${furiaLeaderboard[0].opponent})` : 'N/A',
      leaderboard: furiaLeaderboard,
    },
    category12: {
      title: 'Team with Most Unique Champions (Champion Pool)',
      leader: teamPoolLeaderboard[0]?.team || 'N/A',
      value: teamPoolLeaderboard[0] ? `${teamPoolLeaderboard[0].uniqueCount} champions` : '0 champions',
      leaderboard: teamPoolLeaderboard,
    },
    category13: {
      title: 'Play-ins: Highest Number of Kills in Single Game',
      leader: killsSingleGameLeaderboard[0] ? `${killsSingleGameLeaderboard[0].kills} Kills` : 'N/A',
      value: killsSingleGameLeaderboard[0] ? `${killsSingleGameLeaderboard[0].kills} kills (${killsSingleGameLeaderboard[0].match})` : '0 kills',
      leaderboard: killsSingleGameLeaderboard,
    },
    category14: {
      title: 'How many unique champions will be picked?',
      leader: `${totalUniquePickedCount} Champions`,
      value: `${totalUniquePickedCount} unique champions picked`,
      leaderboard: winrates.sort((a, b) => b.picks - a.picks),
    },
    category15: {
      title: 'Will Teemo be picked?',
      leader: isTeemoPicked ? 'Yes' : 'No',
      value: isTeemoPicked ? 'Teemo has been picked!' : 'Teemo has not been picked yet.',
      leaderboard: [...uniqueChampsPickedTotal].sort(),
    },
    category16: {
      title: 'Champion Banned Most',
      leader: bardLeaderboard[0]?.champion || 'N/A',
      value: bardLeaderboard[0] ? `${bardLeaderboard[0].bans} bans` : '0 bans',
      leaderboard: bardLeaderboard,
    },
  };
}

async function refreshAggregate(env, { bypassCache = false } = {}) {
  const [{ playerImages, teamImages }, patchVersion, matches] = await Promise.all([
    fetchLolesportsImages(env),
    fetchPatchVersion(env),
    parseMatchList(env, { bypassCache }),
  ]);

  const completed = matches.filter((m) => m.isCompleted);
  const games = [];

  for (const match of completed) {
    let gameIds;
    try {
      gameIds = await parseMatchGameIds(match, env);
    } catch (err) {
      console.warn(`game list parse failed for ${match.matchId}`, err);
      continue;
    }
    for (const gameId of gameIds) {
      const parsedKey = CACHE_PREFIX_GAME_PARSED + gameId;
      let parsed = bypassCache ? null : await env.MSI_CACHE.get(parsedKey, { type: 'json' });
      if (!parsed) {
        try {
          parsed = await parseGameDetails(gameId, match.stage, match.date, env);
          if (parsed) {
            await env.MSI_CACHE.put(parsedKey, JSON.stringify(parsed), { expirationTtl: HTML_TTL_SECONDS });
          }
        } catch (err) {
          console.warn(`game parse failed for ${gameId}`, err);
          continue;
        }
      }
      if (parsed) games.push(parsed);
    }
  }

  const stats = compileStats(games);

  const aggregate = {
    lastUpdated: new Date().toISOString(),
    patchVersion,
    playerImages,
    teamImages,
    gamesCount: games.length,
    games,
    stats,
  };

  await env.MSI_CACHE.put(CACHE_KEY_AGGREGATE, JSON.stringify(aggregate));
  return aggregate;
}

async function getAggregate(env) {
  const cached = await env.MSI_CACHE.get(CACHE_KEY_AGGREGATE, { type: 'json' });
  return cached;
}

export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const parts = url.pathname.split('/').filter(Boolean);

    if (parts[0] !== 'api' || parts[1] !== 'msi') {
      return json({ error: 'not found' }, { status: 404 });
    }

    if (parts[2] === 'refresh') {
      const bypassCache = url.searchParams.get('force') === 'true';
      try {
        const aggregate = await refreshAggregate(env, { bypassCache });
        return json({ ok: true, gamesCount: aggregate.gamesCount, lastUpdated: aggregate.lastUpdated });
      } catch (err) {
        return json({ ok: false, error: String(err?.message || err) }, { status: 500 });
      }
    }

    const aggregate = await getAggregate(env);
    if (aggregate) {
      ctx.waitUntil(maybeBackgroundRefresh(env, aggregate));
      return json(aggregate);
    }

    try {
      const fresh = await refreshAggregate(env);
      return json(fresh);
    } catch (err) {
      return json({ error: String(err?.message || err) }, { status: 502 });
    }
  },

  async scheduled(_event, env, ctx) {
    ctx.waitUntil(refreshAggregate(env).catch((err) => console.error('cron refresh failed', err)));
  },
};

async function maybeBackgroundRefresh(env, aggregate) {
  const last = Date.parse(aggregate.lastUpdated || 0);
  if (Number.isNaN(last)) return;
  const ageMs = Date.now() - last;
  if (ageMs < MATCHLIST_TTL_SECONDS * 1000) return;
  try {
    await refreshAggregate(env);
  } catch (err) {
    console.warn('background refresh failed', err);
  }
}
