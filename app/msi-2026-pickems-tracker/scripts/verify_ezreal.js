import fs from 'fs';

const data = JSON.parse(fs.readFileSync('src/data/msi_data.json', 'utf-8'));
data.games.forEach(g => {
  g.players.forEach(p => {
    if (p.champion === 'Ezreal') {
      console.log(`Game ${g.gameId}: ${p.name} on Ezreal stats: ${p.kills}/${p.deaths}/${p.assists} (team=${p.team})`);
    }
  });
});
