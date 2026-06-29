import fs from 'fs';

const data = JSON.parse(fs.readFileSync('src/data/msi_data.json', 'utf-8'));
const lb = data.stats.category1.leaderboard;

// Show items around Vi and Jarvan IV
lb.forEach((item, idx) => {
  const name = item.champion || item.player || item.team;
  if (name === 'Vi' || name === 'Jarvan IV' || idx < 5 || idx > lb.length - 3) {
    console.log(`#${idx + 1}: ${name} = ${item.count} picks`);
  }
});

console.log('\nAll 1-pick champions:');
lb.filter(i => i.count === 1).forEach((item, idx) => {
  console.log(`  ${item.champion}`);
});
