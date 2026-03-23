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

export const mockTeams: Team[] = [
  { id: '1', name: 'T1', acronym: 'T1', region: 'LCK', image_url: 'https://static.lolesports.com/teams/1726801573959_539px-T1_2019_full_allmode.png', wins: 15, losses: 3 },
  { id: '2', name: 'Gen.G', acronym: 'GEN', region: 'LCK', image_url: 'https://static.lolesports.com/teams/1773829250929_GENGLOGO_GOLD.png', wins: 17, losses: 1 },
  { id: '3', name: 'G2 Esports', acronym: 'G2', region: 'LEC', image_url: 'https://static.lolesports.com/teams/G2-FullonDark.png', wins: 12, losses: 6 },
  { id: '4', name: 'Cloud9', acronym: 'C9', region: 'LCS', image_url: 'https://static.lolesports.com/teams/1736924120254_C9Kia_IconBlue_Transparent_2000x2000.png', wins: 10, losses: 8 },
  { id: '5', name: 'Bilibili Gaming', acronym: 'BLG', region: 'LPL', image_url: 'https://static.lolesports.com/teams/1682322954525_Bilibili_Gaming_logo_20211.png', wins: 14, losses: 2 },
  { id: '6', name: 'Team Liquid', acronym: 'TL', region: 'LCS', image_url: 'https://static.lolesports.com/teams/1769357207762_TLAlienware_Minimal_Bug-White.png', wins: 11, losses: 7 },
];

export const mockPlayers: Player[] = [
  { id: '101', summoner_name: 'Faker', role: 'Mid', team_id: '1', image_url: 'https://static.lolesports.com/players/1769087499078_LCK_T1_Faker_F.PNG' },
  { id: '102', summoner_name: 'Zeus', role: 'Top', team_id: '1', image_url: 'https://static.lolesports.com/players/1769089435131_LCK_HLE_Zeus_F.PNG' },
  { id: '103', summoner_name: 'Chovy', role: 'Mid', team_id: '2', image_url: 'https://static.lolesports.com/players/1769089983865_LCK_GEN_Chovy_F.PNG' },
  { id: '104', summoner_name: 'Caps', role: 'Mid', team_id: '3', image_url: 'https://static.lolesports.com/players/1768549998426_Caps-01.png' },
  { id: '105', summoner_name: 'Blaber', role: 'Jungle', team_id: '4', image_url: 'https://static.lolesports.com/players/1769149391904_AME_LCS26S1_C9_BLABER.png' },
];
