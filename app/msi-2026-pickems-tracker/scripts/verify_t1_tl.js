import fs from 'fs';
import * as cheerio from 'cheerio';

const games = ['79526', '79527', '79528'];
games.forEach(gId => {
  const html = fs.readFileSync(`data/cache/gol.gg_game_stats_${gId}_page-game_.html`, 'utf-8');
  const $ = cheerio.load(html);
  console.log(`--- Game ${gId} ---`);
  $('table.playersInfosLine tbody tr').each((i, rowEl) => {
    const cols = $(rowEl).find('td');
    if (cols.length < 4) return;
    const player = cols.eq(0).find('a.link-blanc').text().trim();
    const champion = cols.eq(0).find('img.champion_icon').attr('alt') || '';
    const kda = cols.eq(cols.length - 2).text().trim();
    console.log(`Player: ${player}, Champion: ${champion}, KDA: ${kda}`);
  });
});
