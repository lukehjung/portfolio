import fs from 'fs';
import * as cheerio from 'cheerio';

const html = fs.readFileSync('data/cache/gol.gg_game_stats_79526_page-game_.html', 'utf-8');
const $ = cheerio.load(html);

console.log('Blue header text:', $('div.col-12.col-sm-6').eq(0).find('.blue-line-header').text().trim());
console.log('Red header text:', $('div.col-12.col-sm-6').eq(1).find('.red-line-header').text().trim());
