import fs from 'fs';
import path from 'path';
import * as cheerio from 'cheerio';

const CACHE_DIR = 'data/cache';
const files = fs.readdirSync(CACHE_DIR).filter(f => f.includes('page-game'));

files.forEach(file => {
  const html = fs.readFileSync(path.join(CACHE_DIR, file), 'utf-8');
  const $ = cheerio.load(html);
  const firstRow = $('table.playersInfosLine tbody tr').first();
  const cols = firstRow.find('td');
  console.log(`${file}: cols.length = ${cols.length}`);
});
