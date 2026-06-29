import fs from 'fs';

const data = JSON.parse(fs.readFileSync('src/data/msi_data.json', 'utf-8'));
data.games.forEach(g => {
  g.players.forEach(p => {
    if (p.name === 'Keria') {
      console.log(`Game ${g.gameId}: Keria on ${p.champion} stats: ${p.kills}/${p.deaths}/${p.assists} (winner=${g.winner === p.team}) stage=${g.stage}`);
    }
  });
});
