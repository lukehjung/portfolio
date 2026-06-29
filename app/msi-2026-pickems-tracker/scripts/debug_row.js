import fs from 'fs';
import * as cheerio from 'cheerio';

const html = fs.readFileSync('data/cache/gol.gg_game_stats_79534_page-game_.html', 'utf-8');
const $ = cheerio.load(html);

const table = $('table.playersInfosLine').first();
const headers = table.find('thead tr th');

console.log(`Table has ${headers.length} headers:`);
headers.each((i, el) => {
  console.log(`Header ${i}: "${$(el).text().trim()}"`);
});
