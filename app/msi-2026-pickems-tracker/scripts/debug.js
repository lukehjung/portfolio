import fs from 'fs';
import path from 'path';
import * as cheerio from 'cheerio';

const filePath = '/Users/lukejung/.gemini/antigravity/scratch/msi-2026-pickems-tracker/data/cache/gol.gg_game_stats_79534_page-game_.html';
const html = fs.readFileSync(filePath, 'utf-8');
const $g = cheerio.load(html);

// Parse damage from script
let blueDmg = [0,0,0,0,0];
let redDmg = [0,0,0,0,0];

const scripts = [];
$g('script').each((i, el) => {
  scripts.push($g(el).text());
});

const allScriptText = scripts.join('\n');
const idx = allScriptText.indexOf('blueDmgData');
console.log('blueDmgData found index:', idx);

if (idx !== -1) {
  const block = allScriptText.substring(idx, idx + 2000);
  console.log('--- SCRIPT BLOCK CONTENT ---');
  console.log(block.substring(0, 500));
  console.log('----------------------------');
  
  const dataArrays = [...block.matchAll(/data:\s*\[([\d.,\s]+)\]/g)];
  console.log('Data arrays matched count:', dataArrays.length);
  dataArrays.forEach((arr, i) => {
    console.log(`Array ${i}:`, arr[1]);
  });
  
  if (dataArrays.length >= 2) {
    blueDmg = dataArrays[0][1].split(',').map(n => Math.round(parseFloat(n.trim()) * 1000));
    redDmg = dataArrays[1][1].split(',').map(n => Math.round(parseFloat(n.trim()) * 1000));
    console.log('Parsed blueDmg:', blueDmg);
    console.log('Parsed redDmg:', redDmg);
  }
}

// Parse players
console.log('--- PLAYER ROWS ---');
$g('table.playersInfosLine').each((tableIdx, tableEl) => {
  console.log(`Table ${tableIdx} (isBlue=${tableIdx === 0}):`);
  const trs = $g(tableEl).find('tbody tr');
  console.log(`  Found with find('tbody tr'): ${trs.length} rows`);
  
  const trsDirect = $g(tableEl).find('tr');
  console.log(`  Found with find('tr'): ${trsDirect.length} rows`);
  
  $g(tableEl).find('tbody tr').each((rowIdx, rowEl) => {
    const cols = $g(rowEl).find('td');
    const playerLink = cols.eq(0).find('a.link-blanc');
    const playerName = playerLink.text().trim();
    const champImg = cols.eq(0).find('img.champion_icon');
    const champion = champImg.attr('alt') || 'Unknown';
    console.log(`    rowIdx=${rowIdx}: player=${playerName}, champion=${champion}`);
  });
});
