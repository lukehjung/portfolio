import fs from 'fs';
import * as cheerio from 'cheerio';

const html = fs.readFileSync('data/cache/gol.gg_game_stats_79536_page-game_.html', 'utf-8');
const $ = cheerio.load(html);

$('table.playersInfosLine').first().find('tbody tr').each((i, rowEl) => {
  const cols = $(rowEl).find('td');
  if (cols.length < 4) return;
  const player = cols.eq(0).find('a.link-blanc').text().trim();
  const champion = cols.eq(0).find('img.champion_icon').attr('alt') || '';
  const kda = cols.eq(cols.length - 2).text().trim();
  console.log(`Player: ${player}, Champion: ${champion}, KDA: ${kda}`);
});
