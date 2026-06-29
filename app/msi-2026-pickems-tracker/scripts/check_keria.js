// Simulate what the frontend does
const cleanName = (str) => {
  if (!str) return '';
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
};

import fs from 'fs';
const data = JSON.parse(fs.readFileSync('src/data/msi_data.json', 'utf-8'));
const lb = data.stats.category5.leaderboard;

// User pick is "Keria"
const rawPick = "Keria";
const cleanPick = cleanName(rawPick);
console.log('cleanPick:', cleanPick);

// Check top 3
const top3Names = lb.slice(0, 3).map(i => ({ name: i.player, clean: cleanName(i.player) }));
console.log('Top 3:', top3Names);
console.log('Match in top 3?', top3Names.some(t => t.clean === cleanPick));

// Check full leaderboard
const lbItem = lb.find((item) => {
  const name = item.champion || item.player || item.team || 'Unknown';
  return cleanName(name) === cleanPick;
});
console.log('Found in leaderboard?', !!lbItem);
if (lbItem) {
  console.log('lbItem:', lbItem);
  console.log('Has kdaFormatted?', lbItem.kdaFormatted !== undefined);
  console.log('Has kda?', lbItem.kda !== undefined);
  console.log('Has kills?', lbItem.kills !== undefined);
}
