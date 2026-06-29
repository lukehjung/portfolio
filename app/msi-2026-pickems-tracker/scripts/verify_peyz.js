import fs from 'fs';

const data = JSON.parse(fs.readFileSync('src/data/msi_data.json', 'utf-8'));

const playerKillsTotal = {};
const playerDeathsTotal = {};
const playerAssistsTotal = {};
const playerGamesPlayIn = {};

data.games.forEach(game => {
  if (game.isPlayIn) {
    game.players.forEach(p => {
      playerKillsTotal[p.name] = (playerKillsTotal[p.name] || 0) + p.kills;
      playerDeathsTotal[p.name] = (playerDeathsTotal[p.name] || 0) + p.deaths;
      playerAssistsTotal[p.name] = (playerAssistsTotal[p.name] || 0) + p.assists;
      playerGamesPlayIn[p.name] = (playerGamesPlayIn[p.name] || 0) + 1;
    });
  }
});

const list = Object.keys(playerGamesPlayIn).map(name => {
  const kills = playerKillsTotal[name] || 0;
  const deaths = playerDeathsTotal[name] || 0;
  const assists = playerAssistsTotal[name] || 0;
  const kda = deaths === 0 ? (kills + assists) / 0.5 : (kills + assists) / deaths;
  return { name, kills, deaths, assists, kda };
});

list.sort((a, b) => b.kda - a.kda);
list.forEach(p => {
  console.log(`${p.name}: ${p.kills}/${p.deaths}/${p.assists} = ${p.kda.toFixed(2)} KDA`);
});
