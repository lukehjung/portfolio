import * as cheerio from 'cheerio';

const url = 'https://gol.gg/game/stats/79539/page-summary/';
const res = await fetch(url, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, http/1.1) Chrome/120.0.0.0 Safari/537.36'
  }
});
const html = await res.text();
const $ = cheerio.load(html);

console.log('Navigation links in gamemenu:');
$('nav.gamemenu a').each((i, el) => {
  console.log(`  Link ${i}: href="${$(el).attr('href')}" text="${$(el).text().trim()}"`);
});
