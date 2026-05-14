export default {
  // v2.1.0 - Multi-region support enabled
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

    // Helper to map user-friendly region to Riot's routing IDs
    function getRegionalRouting(region) {
      const regions = {
        'na': { platform: 'na1', cluster: 'americas' },
        'euw': { platform: 'euw1', cluster: 'europe' },
        'eune': { platform: 'eun1', cluster: 'europe' },
        'kr': { platform: 'kr', cluster: 'asia' },
        'jp': { platform: 'jp1', cluster: 'asia' },
        'br': { platform: 'br1', cluster: 'americas' },
        'lan': { platform: 'la1', cluster: 'americas' },
        'las': { platform: 'la2', cluster: 'americas' },
        'oce': { platform: 'oc1', cluster: 'sea' },
        'tr': { platform: 'tr1', cluster: 'europe' },
        'ru': { platform: 'ru', cluster: 'europe' },
        'ph': { platform: 'ph2', cluster: 'sea' },
        'sg': { platform: 'sg2', cluster: 'sea' },
        'th': { platform: 'th2', cluster: 'sea' },
        'tw': { platform: 'tw2', cluster: 'sea' },
        'vn': { platform: 'vn2', cluster: 'sea' }
      };
      return regions[region.toLowerCase()] || regions['na'];
    }

    if (pathParts[0] === 'api' && pathParts[1] === 'tft' && pathParts[2] === 'profile') {
      const region = pathParts[3];
      const gameName = pathParts[4];
      const tagLine = pathParts[5];

      if (!gameName || !tagLine) return new Response("Missing identifiers", { status: 400 });

      const routing = getRegionalRouting(region);
      const forceRefresh = url.searchParams.get('refresh') === 'true';

      // 1. Initialize the Cloudflare Cache
      const cacheUrl = new URL(request.url);
      cacheUrl.searchParams.delete('refresh'); // Prevent cache key fragmentation
      const cacheKey = new Request(cacheUrl.toString(), request);
      const cache = caches.default;
      
      // 2. Check if this exact player has been fetched in the last 30 minutes
      let response = null;
      if (!forceRefresh) {
        response = await cache.match(cacheKey);
      }
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
      const kvKey = `profile_${region.toLowerCase()}_${gameName.toLowerCase()}_${tagLine.toLowerCase()}`;

      const handleFallback = async (errResp, status = 500) => {
        if (env.TFT_CACHE) {
          try {
            const cachedValue = await env.TFT_CACHE.get(kvKey);
            if (cachedValue) {
              const payload = JSON.parse(cachedValue);
              payload.isStale = true;
              return new Response(JSON.stringify(payload), {
                status: 200,
                headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
              });
            }
          } catch (e) {}
        }
        if (errResp) return errResp;
        return new Response(JSON.stringify({ error: "Failed to fetch from Riot" }), { status, headers: { "Access-Control-Allow-Origin": "*" } });
      };

      try {
        const accountRes = await fetch(`https://${routing.cluster}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${gameName}/${tagLine}`, { headers });
        if (!accountRes.ok) {
          const errorData = await accountRes.json().catch(() => ({}));
          const errStatus = accountRes.status;
          const errResp = new Response(JSON.stringify({ error: errorData.status?.message || "Riot API Error" }), { 
            status: errStatus, 
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } 
          });
          return handleFallback(errResp, errStatus);
        }
        const accountData = await accountRes.json();
        const puuid = accountData.puuid;

        const summonerRes = await fetch(`https://${routing.platform}.api.riotgames.com/tft/summoner/v1/summoners/by-puuid/${puuid}`, { headers });
        const summonerData = await summonerRes.json();

        let leagueData = [];
        let debugLog = "Starting ranked fetch...";

        const puuidLeagueRes = await fetch(`https://${routing.platform}.api.riotgames.com/tft/league/v1/by-puuid/${puuid}`, { headers });
        if (puuidLeagueRes.ok) {
          leagueData = await puuidLeagueRes.json();
          debugLog = "Success using tft-league-v1/by-puuid";
        } else {
          const lolSummonerRes = await fetch(`https://${routing.platform}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${puuid}`, { headers });
          if (lolSummonerRes.ok) {
            const lolSummonerData = await lolSummonerRes.json().catch(() => ({}));
            
            const possibleId = lolSummonerData.id || lolSummonerData.summonerId || summonerData.id || summonerData.summonerId;
            
            if (possibleId) {
              const leagueRes = await fetch(`https://${routing.platform}.api.riotgames.com/tft/league/v1/entries/by-summoner/${possibleId}`, { headers });
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
            const errorData = await lolSummonerRes.json().catch(() => ({}));
            debugLog = "Missing LoL API Permissions: " + JSON.stringify(errorData);
          }
        }

        // 1. Fetch up to 100 recent match IDs
        const matchRes = await fetch(`https://${routing.cluster}.api.riotgames.com/tft/match/v1/matches/by-puuid/${puuid}/ids?count=100`, { headers });
        const matchIds = matchRes.ok ? await matchRes.json() : [];

        let matchHistory = [];
        
        if (Array.isArray(matchIds) && matchIds.length > 0) {
          const missingIds = [];
          
          // 2. Look up all Match IDs in KV in parallel
          const kvPromises = matchIds.map(async (id) => {
             if (!env.TFT_CACHE) return { id, data: null };
             try {
                const cached = await env.TFT_CACHE.get(`match_${id}`);
                return { id, data: cached ? JSON.parse(cached) : null };
             } catch (e) {
                return { id, data: null };
             }
          });
          
          const kvResults = await Promise.all(kvPromises);
          
          for (const result of kvResults) {
             if (result.data) {
                matchHistory.push(result.data);
             } else {
                missingIds.push(result.id);
             }
          }

          // 3. Fetch all missing matches up to the 100 limit
          const idsToFetch = missingIds;
          
          if (idsToFetch.length > 0) {
             debugLog += ` | Fetching ${idsToFetch.length} new matches`;
             
             // Fetch sequentially to prevent hitting burst rate limits (20/sec)
             for (const id of idsToFetch) {
               try {
                 const res = await fetch(`https://${routing.cluster}.api.riotgames.com/tft/match/v1/matches/${id}`, { headers });
                 if (res.ok) {
                   const matchData = await res.json();
                   matchHistory.push(matchData);
                   // Cache it indefinitely!
                   if (env.TFT_CACHE) {
                     ctx.waitUntil(env.TFT_CACHE.put(`match_${id}`, JSON.stringify(matchData)));
                   }
                 }
               } catch (e) {
                 debugLog += ` | Failed match ${id}`;
               }
               // Delay to respect 20 requests per 1 second limit
               await new Promise(r => setTimeout(r, 60));
             }
          }
          
          // Sort match history by game_datetime descending
          matchHistory.sort((a, b) => {
             const timeA = a.info?.game_datetime || 0;
             const timeB = b.info?.game_datetime || 0;
             return timeB - timeA;
          });
        }

        const responsePayload = {
          account: accountData,
          summoner: summonerData,
          ranked: leagueData,
          recentMatches: matchIds,
          matchHistory: matchHistory,
          debugLog: debugLog,
          region: region // Store region in payload
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
        
        // 5. Persist the response in KV indefinitely
        if (env.TFT_CACHE) {
          ctx.waitUntil(env.TFT_CACHE.put(kvKey, JSON.stringify(responsePayload)));
        }

        return response;
      } catch (err) {
        return handleFallback(null, 500);
      }
    }

    return new Response("Endpoint not found", { status: 404 });
  }
};
