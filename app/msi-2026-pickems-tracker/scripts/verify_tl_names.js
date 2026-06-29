import fs from 'fs';
import * as cheerio from 'cheerio';

const html = fs.readFileSync('data/cache/gol.gg_game_stats_79526_page-game_.html', 'utf-8');
const $ = cheerio.load(html);

$('table.playersInfosLine').each((tableIdx, tableEl) => {
  console.log(`Table ${tableIdx}:`);
  $(tableEl).find('tbody tr').each((rowIdx, rowEl) => {
    const cols = $(rowEl).find('td');
    if (cols.length < 4) return;
    const name = cols.eq(0).find('a.link-blanc').text().trim();
    if (name) {
      console.log(`  Row ${rowIdx}: "${name}"`);
    }
  });
});
