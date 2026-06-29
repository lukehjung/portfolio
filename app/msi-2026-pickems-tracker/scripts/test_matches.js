import fs from 'fs';
import * as cheerio from 'cheerio';

const html = fs.readFileSync('data/cache/gol.gg_tournament_tournament-matchlist_MSI%25202026_.html', 'utf-8');
const $ = cheerio.load(html);

$('table').each((tableIdx, tableEl) => {
  console.log(`Table ${tableIdx}:`);
  $(tableEl).find('tr').each((rowIdx, rowEl) => {
    const cols = $(rowEl).find('td');
    if (cols.length === 0) return; // skip header tr
    console.log(`  Row ${rowIdx}: cols.length = ${cols.length}, text = "${cols.first().text().trim()}"`);
  });
});
