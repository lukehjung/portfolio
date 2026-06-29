import * as cheerio from 'cheerio';

async function verifyGame(gameId) {
  const url = `https://gol.gg/game/stats/${gameId}/page-game/`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });
  const html = await res.text();
  const $ = cheerio.load(html);
  
  // Get first player name and champion
  const firstRow = $('table.playersInfosLine tbody tr').first();
  const player = firstRow.find('td').eq(0).find('a.link-blanc').text().trim();
  const champion = firstRow.find('td').eq(0).find('img.champion_icon').attr('alt') || '';
  const kda = firstRow.find('td').eq(11).text().trim();
  console.log(`Game ${gameId}: Player 1: ${player}, Champion: ${champion}, KDA: ${kda}`);
}

await verifyGame(79536);
await verifyGame(79537);
await verifyGame(79538);
