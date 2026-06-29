import * as cheerio from 'cheerio';

const url = 'https://gol.gg/game/stats/79539/page-game/';
const res = await fetch(url, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  }
});
const html = await res.text();
const $ = cheerio.load(html);

console.log('Blue header HTML:', $('div.col-12.col-sm-6').eq(0).html());
console.log('Red header HTML:', $('div.col-12.col-sm-6').eq(1).html());
console.log('First playersInfosLine exists:', $('table.playersInfosLine').length);
