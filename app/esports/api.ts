// We use the same interface for our components, but populate it with real API data.
export interface Team {
    id: string;
    name: string;
    acronym: string;
    region: string;
    image_url: string;
    wins: number;
    losses: number;
  }
  
  export interface Player {
    id: string;
    summoner_name: string;
    role: string;
    team_id: string;
    image_url: string;
  }
  
  const API_KEY = '0TvQnueqKa5mxJntVWt0w4LpLfEkrV1Ta8rQBb9Z';
  
  export async function fetchEsportsData(): Promise<{ teams: Team[], players: Player[] }> {
    try {
      const res = await fetch('https://esports-api.lolesports.com/persisted/gw/getTeams?hl=en-US', {
        headers: {
          'x-api-key': API_KEY
        },
        next: { revalidate: 3600 } // Cache for 1 hour to prevent rate limits
      });
  
      if (!res.ok) {
        console.error('Failed to fetch from lolesports API');
        return { teams: [], players: [] };
      }
  
      const data = await res.json();
      const rawTeams = data?.data?.teams || [];
  
      const teams: Team[] = [];
      const players: Player[] = [];
  
      // Parse the large GraphQL response into our models
      const playerMap = new Map<string, Player>();

      rawTeams.forEach((t: any) => {
        // Only include teams with valid images and codes
        if (t.image && t.name) {
          const teamId = t.id || t.slug;
          const hasLeague = !!t.homeLeague;
          
          teams.push({
            id: teamId,
            name: t.name,
            acronym: t.code || t.slug.substring(0, 4).toUpperCase(),
            region: t.homeLeague?.name || 'Global',
            image_url: t.image,
            wins: 0, // Standings are in a separate endpoint, leaving 0 for now
            losses: 0,
          });
  
          if (t.players && Array.isArray(t.players)) {
            t.players.forEach((p: any) => {
              if (p.image && p.summonerName) {
                  const existing = playerMap.get(String(p.id));
                  let shouldUpdate = false;
                  
                  if (!existing) {
                      shouldUpdate = true;
                  } else {
                      // Overwrite if the new team's structural league tier strictly supersedes the older affiliation
                      const oldTeam = teams.find(x => x.id === existing.team_id);
                      const oldRegion = oldTeam?.region || 'Global';
                      const newRegion = t.homeLeague?.name || 'Global';

                      const getScore = (reg: string) => {
                          if (reg === 'Global') return 1;
                          const l = reg.toLowerCase();
                          if (l.includes('challenger') || l.includes('academy') || l.includes('nacl')) return 2;
                          return 3; // Tier 1 Main Roster
                      };
                      
                      if (getScore(newRegion) > getScore(oldRegion)) {
                          shouldUpdate = true;
                      }
                  }

                  if (shouldUpdate) {
                      playerMap.set(String(p.id), {
                        id: String(p.id),
                        summoner_name: p.summonerName,
                        role: p.role || 'Player',
                        team_id: teamId,
                        image_url: p.image || (existing ? existing.image_url : ''),
                      });
                  }
              }
            });
          }
        }
      });
      
      players.push(...Array.from(playerMap.values()));
  
      return { teams, players };
    } catch (e) {
      console.error(e);
      return { teams: [], players: [] };
    }
  }

  export interface Match {
    id: string;
    startTime: string;
    league: string;
    blockName: string;
    opponent: {
      name: string;
      acronym: string;
      image_url: string;
    };
    result: string;
    teamWins: number;
    opponentWins: number;
    bestOf: number;
  }
  
  export async function fetchTeamMatches(teamCode: string, leagueName: string): Promise<Match[]> {
    const matches: Match[] = [];
    let pageToken = '';
    
    try {
      // 1. Fetch leagues to map leagueName to leagueId
      const leaguesRes = await fetch('https://esports-api.lolesports.com/persisted/gw/getLeagues?hl=en-US', {
        headers: { 'x-api-key': API_KEY },
        next: { revalidate: 3600 * 24 } // cache for 1 day
      });
      const leaguesData = await leaguesRes.json();
      const league = leaguesData?.data?.leagues?.find((l: any) => l.name === leagueName || l.slug === leagueName.toLowerCase());
      const GLOBAL_MAJORS = ['98767975604431411', '98767991325878492', '113464388705111224', '110988878756156222'];
      const leagueIds = [...GLOBAL_MAJORS];
      if (league && !leagueIds.includes(league.id)) leagueIds.push(league.id);
      const leagueParam = `&leagueId=${leagueIds.join(',')}`;

      // 2. Fetch up to 4 pages of the specific league's schedule to find the team's 15 most recent matches
      for (let i = 0; i < 4; i++) {
        const url = `https://esports-api.lolesports.com/persisted/gw/getSchedule?hl=en-US${leagueParam}${pageToken ? `&pageToken=${pageToken}` : ''}`;
        const res = await fetch(url, {
          headers: { 'x-api-key': API_KEY },
          next: { revalidate: 3600 }
        });
        const data = await res.json();
        
        const events = data?.data?.schedule?.events || [];
        // The API returns events in chronological order usually, so we process it. 
        // We probably want the most recent 'older' events.
        for (let j = events.length - 1; j >= 0; j--) {
          const event = events[j];
          if (event.state === 'completed' && event.type === 'match' && event.match && event.match.teams) {
            const teams = event.match.teams;
            const myTeamIndex = teams.findIndex((t: any) => t.code === teamCode || t.name === teamCode);
            
            if (myTeamIndex !== -1 && matches.length < 15) {
              const opponentIndex = myTeamIndex === 0 ? 1 : 0;
              const myTeam = teams[myTeamIndex];
              const opponent = teams[opponentIndex];
              
              matches.push({
                id: event.match.id,
                startTime: event.startTime,
                league: event.league.name,
                blockName: event.blockName,
                opponent: {
                  name: opponent.name,
                  acronym: opponent.code,
                  image_url: opponent.image
                },
                result: myTeam.result?.outcome || 'unplayed',
                teamWins: myTeam.result?.gameWins || 0,
                opponentWins: opponent.result?.gameWins || 0,
                bestOf: event.match.strategy?.count || 1
              });
            }
          }
        }
        
        if (matches.length >= 15) break;
        
        // Go backwards in time
        const olderToken = data?.data?.schedule?.pages?.older;
        if (!olderToken) break;
        pageToken = olderToken;
      }
    } catch (e) {
      console.error(e);
    }
    
    return matches;
  }
  
  export interface MatchDetailGame {
    id: string;
    number: number;
    state: string;
    blueTeamId: string;
    redTeamId: string;
    vodParameter?: string;
  }

  export interface MatchDetails {
    id: string;
    teams: {
      id: string;
      name: string;
      acronym: string;
      wins: number;
    }[];
    games: MatchDetailGame[];
  }

  export async function fetchMatchDetails(matchId: string): Promise<MatchDetails | null> {
    try {
      const res = await fetch(`https://esports-api.lolesports.com/persisted/gw/getEventDetails?hl=en-US&id=${matchId}`, {
        headers: { 'x-api-key': API_KEY },
        next: { revalidate: 3600 }
      });
      if (!res.ok) return null;
      
      const data = await res.json();
      const event = data?.data?.event;
      if (!event || !event.match) return null;

      const match = event.match;
      
      const parsedTeams = match.teams.map((t: any) => ({
        id: t.id,
        name: t.name,
        acronym: t.code,
        wins: t.result?.gameWins || 0
      }));

      const parsedGames = match.games.map((g: any) => {
        // Find English Youtube VOD, fallback to first youtube VOD, fallback to any VOD
        let vodParam = undefined;
        if (g.vods && g.vods.length > 0) {
          const enVod = g.vods.find((v: any) => v.locale === 'en-US' && v.provider === 'youtube');
          const anyYoutube = g.vods.find((v: any) => v.provider === 'youtube');
          const finalVod = enVod || anyYoutube || g.vods[0];
          vodParam = finalVod?.parameter;
        }

        const blueTeam = g.teams?.find((t: any) => t.side === 'blue');
        const redTeam = g.teams?.find((t: any) => t.side === 'red');

        return {
          id: g.id,
          number: g.number,
          state: g.state,
          blueTeamId: blueTeam?.id || '',
          redTeamId: redTeam?.id || '',
          vodParameter: vodParam
        };
      });

      return {
        id: event.id,
        teams: parsedTeams,
        games: parsedGames
      };
    } catch (e) {
      console.error("Failed to fetch match details", e);
      return null;
    }
  }
  
