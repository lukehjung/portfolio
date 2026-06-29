import fs from 'fs';

const data = JSON.parse(fs.readFileSync('src/data/msi_data.json', 'utf-8'));
console.log('Local stats categories:');
Object.keys(data.stats).forEach(catKey => {
  const cat = data.stats[catKey];
  console.log(`${catKey} (${cat.title}): leader=[${cat.leader}] value=[${cat.value}]`);
});
