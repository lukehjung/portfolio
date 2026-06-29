import fs from 'fs';
import * as cheerio from 'cheerio';

const html = fs.readFileSync('data/cache/gol.gg_tournament_tournament-matchlist_MSI%25202026_.html', 'utf-8');
const $ = cheerio.load(html);

$('table tbody tr').each((rowIdx, el) => {
  const cols = $(el).find('td');
  if (cols.length < 7) return;
  const team1 = cols.eq(1).text().trim();
  const score = cols.eq(2).text().trim();
  const team2 = cols.eq(3).text().trim();
  const stage = cols.eq(4).text().trim();
  console.log(`Tbody Row ${rowIdx}: [${team1}] [${score}] [${team2}] stage=[${stage}]`);
});
