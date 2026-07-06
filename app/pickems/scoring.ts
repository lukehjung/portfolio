import { TIERED_CATEGORIES, TIER_POINTS, CATEGORIES_INFO } from './constants';

export const cleanName = (str: string) => {
  if (!str) return '';
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
};

export const resolveEntryName = (item: any, categoryKey: string): string => {
  if (!item) return '';
  if (typeof item === 'string') return item;
  const info = CATEGORIES_INFO[categoryKey];
  if (!info) return String(item);
  if (info.type === 'champion') return item.champion || '';
  if (info.type === 'player') return item.player || '';
  if (info.type === 'team') return item.team || '';
  return item.champion || item.player || item.team || String(item);
};

export const isKillsRangeMatch = (pickRange: string, actualKillsText: string) => {
  if (!pickRange || !actualKillsText) return false;
  const kills = parseInt(actualKillsText.replace(/\D/g, ''));
  if (isNaN(kills)) return false;

  const cleanRange = pickRange.trim();
  if (cleanRange.startsWith('<')) {
    const val = parseInt(cleanRange.replace('<', ''));
    return kills < val;
  }
  if (cleanRange.startsWith('>')) {
    const val = parseInt(cleanRange.replace('>', ''));
    return kills > val;
  }
  if (cleanRange.includes('-')) {
    const [min, max] = cleanRange.split('-').map(Number);
    return kills >= min && kills <= max;
  }
  return false;
};

export const isChampsRangeMatch = (pickRange: string, actualCountText: string) =>
  isKillsRangeMatch(pickRange, actualCountText);

export const isPickCorrect = (categoryKey: string, pick: string, leaderName: string) => {
  if (!leaderName || leaderName === 'N/A' || leaderName === 'Unknown') return false;

  if (categoryKey === 'category13') return isKillsRangeMatch(pick, leaderName);
  if (categoryKey === 'category14') return isChampsRangeMatch(pick, leaderName);
  if (categoryKey === 'category15') {
    const cleanPick = pick.toLowerCase();
    const cleanLeader = leaderName.toLowerCase();
    const isYesPick = cleanPick === 'yes' || cleanPick === 'true' || cleanPick === 'will be picked';
    const isYesLeader = cleanLeader === 'yes' || cleanLeader === 'true';
    return isYesPick === isYesLeader;
  }

  return cleanName(pick) === cleanName(leaderName);
};

export const getEntryValue = (item: any): number | null => {
  if (!item) return null;
  if (item.count !== undefined) return item.count;
  if (item.kills !== undefined) return item.kills;
  if (item.fbCount !== undefined) return item.fbCount;
  if (item.avgDmg !== undefined) return item.avgDmg;
  if (item.elderDragons !== undefined) return item.elderDragons;
  if (item.uniqueCount !== undefined) return item.uniqueCount;
  if (item.bans !== undefined) return item.bans;
  if (item.cs !== undefined) return item.cs;
  if (item.kda !== undefined) return item.kda;
  return null;
};

export const buildTierMap = (leaderboard: any[]): Map<number, number> => {
  const seen: number[] = [];
  for (const item of leaderboard) {
    const v = getEntryValue(item);
    if (v == null) continue;
    if (!seen.includes(v)) {
      seen.push(v);
      if (seen.length >= 3) break;
    }
  }
  const tierMap = new Map<number, number>();
  seen.forEach((v, idx) => tierMap.set(v, idx));
  return tierMap;
};

export const getTierPointsForPick = (categoryKey: string, pick: string, leaderboard: any[]): number => {
  if (!pick || !Array.isArray(leaderboard) || leaderboard.length === 0) return 0;
  const cleanPick = cleanName(pick);
  const match = leaderboard.find((item) => {
    const name = resolveEntryName(item, categoryKey);
    return cleanName(name) === cleanPick;
  });
  if (!match) return 0;
  const value = getEntryValue(match);
  if (value == null) return 0;
  const tierMap = buildTierMap(leaderboard);
  const tier = tierMap.get(value);
  return tier == null ? 0 : TIER_POINTS[tier];
};

export const getPickPlacementInfo = (key: string, pick: string, catStat: any, info: any) => {
  if (!pick) return { correct: false, tier: -1, pts: 0, text: '' };

  if (TIERED_CATEGORIES.has(key)) {
    const leaderboard = catStat?.leaderboard || [];
    if (leaderboard.length === 0) return { correct: false, tier: -1, pts: 0, text: '' };

    const cleanPick = cleanName(pick);
    const match = leaderboard.find((item: any) => {
      const name = resolveEntryName(item, key);
      return cleanName(name) === cleanPick;
    });

    if (!match) return { correct: false, tier: -1, pts: 0, text: '' };
    const value = getEntryValue(match);
    if (value == null) return { correct: false, tier: -1, pts: 0, text: '' };

    const tierMap = buildTierMap(leaderboard);
    const tier = tierMap.get(value); // 0, 1, 2
    if (tier == null || tier > 2) return { correct: false, tier: -1, pts: 0, text: '' };

    const pts = TIER_POINTS[tier] || 0;
    const ordinals = ['1st', '2nd', '3rd'];
    return {
      correct: true,
      tier,
      pts,
      text: `(${ordinals[tier]}, +${pts} pts)`
    };
  }

  const leader = catStat?.leader;
  const correct = isPickCorrect(key, pick, leader);
  if (correct) {
    return {
      correct: true,
      tier: 0,
      pts: info.pts,
      text: `(1st, +${info.pts} pts)`
    };
  }

  return { correct: false, tier: -1, pts: 0, text: '' };
};
