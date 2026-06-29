async function checkGame(gameId) {
  try {
    const url = `https://gol.gg/game/stats/${gameId}/page-game/`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    console.log(`Game ${gameId}: status = ${res.status}`);
    if (res.ok) {
      const text = await res.text();
      console.log(`  Found "WIN" or "LOSS"?`, text.includes('WIN') || text.includes('LOSS'));
    }
  } catch (err) {
    console.error(`Game ${gameId} failed:`, err);
  }
}

for (let id = 79537; id <= 79543; id++) {
  await checkGame(id);
}
