export const CATEGORY_KEYS = [
  'category1', 'category2', 'category3', 'category4',
  'category5', 'category6', 'category7', 'category8',
  'category9', 'category10', 'category11', 'category12',
  'category13', 'category14', 'category15', 'category16',
];

export const CATEGORIES_INFO: Record<string, any> = {
  category1: { key: 'category1', title: 'Vi', label: 'Most Picked Champ', pts: 50, desc: 'For MSI Play-ins: which champion will be picked the most?', type: 'champion' },
  category2: { key: 'category2', title: 'Ashe', label: 'Highest WR Champ', pts: 50, desc: 'Which champion will have the highest winrate? (minimum 5 games played)', type: 'champion' },
  category3: { key: 'category3', title: 'JarvanIV', label: 'Lowest WR Champ', pts: 50, desc: 'Which champion will have the lowest winrate? (minimum 5 games played)', type: 'champion' },
  category4: { key: 'category4', title: 'Ezreal', label: 'Most Kills Champ', pts: 50, desc: 'Which champion will have the most kills?', type: 'champion' },
  category5: { key: 'category5', title: 'Keria', label: 'Highest KDA Pro', pts: 50, desc: 'For MSI Play-ins: which pro will have the highest KDA?', type: 'player' },
  category6: { key: 'category6', title: 'Viper', label: 'Highest Single CS', pts: 100, desc: 'Which pro will earn the highest CS in a single game?', type: 'player' },
  category7: { key: 'category7', title: 'Oner', label: 'Most First Bloods', pts: 50, desc: 'Which pro will get the most First Bloods?', type: 'player' },
  category8: { key: 'category8', title: 'Peyz', label: 'Highest Avg Damage', pts: 50, desc: 'Which pro will finish with the highest average damage per game?', type: 'player' },
  category9: { key: 'category9', title: 'T1', label: 'Shortest Game Win', pts: 100, desc: 'For MSI Play-ins: which team will win the shortest game (duration)?', type: 'team' },
  category10: { key: 'category10', title: 'T1', label: 'Most Elder Dragons', pts: 50, desc: 'Which team will kill the most Elder Dragons?', type: 'team' },
  category11: { key: 'category11', title: 'FURIA', label: 'Least Kills Game', pts: 50, desc: 'Which team will get the least kills in a single game?', type: 'team' },
  category12: { key: 'category12', title: 'T1', label: 'Largest Champ Pool', pts: 50, desc: 'Which team will play the most unique Champions (largest champion pool)?', type: 'team' },
  category13: { key: 'category13', title: '31-45', label: 'Max Game Kills', pts: 50, desc: 'For MSI Play-ins: what will be the highest number of kills in a single game?', type: 'range' },
  category14: { key: 'category14', title: '105-109', label: 'Unique Champs Picked', pts: 50, desc: 'How many unique champions will be picked?', type: 'range' },
  category15: { key: 'category15', title: 'False. Never.', label: 'Will Teemo Be Picked', pts: 100, desc: 'Will Teemo be picked?', type: 'boolean' },
  category16: { key: 'category16', title: 'Bard', label: 'Most Banned Champ', pts: 50, desc: 'Which champion will be banned the most?', type: 'champion' },
};

export const TIERED_CATEGORIES = new Set([
  'category1', 'category4', 'category5', 'category6',
  'category7', 'category8', 'category10', 'category11', 'category12', 'category16'
]);

export const DONE_CATEGORIES = new Set(['category1', 'category5', 'category9', 'category13']);
export const TIER_POINTS = [50, 20, 10];

export const MSI_PROXY_URL = 'https://msi-proxy.lukethejung.workers.dev/api/msi';
export const PARTICIPANTS_URL = 'https://msi-proxy.lukethejung.workers.dev/api/participants';
