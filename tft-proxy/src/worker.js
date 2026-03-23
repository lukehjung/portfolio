export default {
  // Notice we added the `ctx` parameter here so we can hook into Cloudflare's cache
  async fetch(request, env, ctx) {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        }
      });
    }

    const url = new URL(request.url);
    const pathParts = url.pathname.split('/').filter(Boolean);

    if (pathParts[0] === 'api' && pathParts[1] === 'tft' && pathParts[2] === 'profile') {
      const gameName = pathParts[3];
      const tagLine = pathParts[4];

      if (!gameName || !tagLine) return new Response("Missing identifiers", { status: 400 });

      // 1. Initialize the Cloudflare Cache
      const cacheUrl = new URL(request.url);
      const cacheKey = new Request(cacheUrl.toString(), request);
      const cache = caches.default;
      
      // 2. Check if this exact player has been fetched in the last 30 minutes
      let response = await cache.match(cacheKey);
      if (response) {
        // We found a cached version! Return it instantly to save Riot API calls.
        const newHeaders = new Headers(response.headers);
        newHeaders.set("Access-Control-Allow-Origin", "*");
        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: newHeaders
        });
      }

      const headers = { "X-Riot-Token": env.RIOT_API_KEY };

      try {
        const accountRes = await fetch(`https://americas.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${gameName}/${tagLine}`, { headers });
        const accountData = await accountRes.json();
        const puuid = accountData.puuid;

        const summonerRes = await fetch(`https://na1.api.riotgames.com/tft/summoner/v1/summoners/by-puuid/${puuid}`, { headers });
        const summonerData = await summonerRes.json();

        let leagueData = [];
        let debugLog = "Starting ranked fetch...";

        const puuidLeagueRes = await fetch(`https://na1.api.riotgames.com/tft/league/v1/entries/by-puuid/${puuid}`, { headers });
        if (puuidLeagueRes.ok) {
          leagueData = await puuidLeagueRes.json();
          debugLog = "Success using tft-league-v1/by-puuid";
        } else {
          const lolSummonerRes = await fetch(`https://na1.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${puuid}`, { headers });
          if (lolSummonerRes.ok) {
            const lolSummonerData = await lolSummonerRes.ok ? await lolSummonerRes.json() : {};
            
            const possibleId = lolSummonerData.id || lolSummonerData.summonerId || summonerData.id || summonerData.summonerId;
            
            if (possibleId) {
              const leagueRes = await fetch(`https://na1.api.riotgames.com/tft/league/v1/entries/by-summoner/${possibleId}`, { headers });
              if (leagueRes.ok) {
                leagueData = await leagueRes.json();
                debugLog = "Success using legacy summonerId: " + possibleId;
              } else {
                debugLog = "Failed fetching league by summonerId: " + leagueRes.status;
              }
            } else {
              debugLog = "Riot completely stripped the legacy 'id' from this account! LOL Payload: " + JSON.stringify(lolSummonerData);
            }
          } else {
            const errorData = await lolSummonerRes.json();
            debugLog = "Missing LoL API Permissions: " + JSON.stringify(errorData);
          }
        }

        const matchRes = await fetch(`https://americas.api.riotgames.com/tft/match/v1/matches/by-puuid/${puuid}/ids?count=15`, { headers });
        const matchIds = await matchRes.json();

        const matchPromises = matchIds.map(id =>
          fetch(`https://americas.api.riotgames.com/tft/match/v1/matches/${id}`, { headers }).then(res => res.json())
        );
        const matchHistory = await Promise.all(matchPromises);

        const responsePayload = {
          account: accountData,
          summoner: summonerData,
          ranked: leagueData,
          recentMatches: matchIds,
          matchHistory: matchHistory,
          debugLog: debugLog
        };

        // 3. Create the response and tell Cloudflare to cache it for 1800 seconds (30 minutes)
        response = new Response(JSON.stringify(responsePayload), {
          headers: { 
            "Content-Type": "application/json", 
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "s-maxage=1800" 
          }
        });

        // 4. Save the new data into the cache
        ctx.waitUntil(cache.put(cacheKey, response.clone()));

        return response;
      } catch (err) {
        return new Response(JSON.stringify({ error: "Failed to fetch from Riot" }), { status: 500, headers: { "Access-Control-Allow-Origin": "*" } });
      }
    }

    return new Response("Endpoint not found", { status: 404 });
  }
};
