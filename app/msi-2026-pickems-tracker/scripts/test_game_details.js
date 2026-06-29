import * as cheerio from 'cheerio';

async function checkGame(gameId) {
  try {
    const url = `https://gol.gg/game/stats/${gameId}/page-game/`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    if (!res.ok) {
      console.log(`Game ${gameId}: status = ${res.status}`);
      return;
    }
    const html = await res.text();
    const $ = cheerio.load(html);
    const blueTeam = $('div.col-12.col-sm-6').eq(0).find('.blue-line-header a').text().trim();
    const redTeam = $('div.col-12.col-sm-6').eq(1).find('.red-line-header a').text().trim();
    const blueWin = $('div.col-12.col-sm-6').eq(0).find('.blue-line-header').text().includes('WIN');
    const winner = blueWin ? blueTeam : redTeam;
    console.log(`Game ${gameId}: [${blueTeam}] vs [${redTeam}] -> Winner: [${winner}]`);
  } catch (err) {
    console.error(`Game ${gameId} failed:`, err);
  }
}

for (let id = 79525; id <= 79545; id++) {
  await checkGame(id);
}
