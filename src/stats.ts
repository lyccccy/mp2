export const STAT_LABELS = {
  hp: 'HP',
  attack: 'Attack',
  defense: 'Defense',
  'special-attack': 'Sp. Attack',
  'special-defense': 'Sp. Defense',
  speed: 'Speed',
  total: 'Total stats',
} as const;

export type StatSort = keyof typeof STAT_LABELS;
export type SortKey = 'id' | 'name' | StatSort;
export type BaseStats = Record<StatSort, number>;
export type StatIndex = Map<number, BaseStats>;
export const BASE_STATS = ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed'] as const;

export function isStatSort(value: string): value is StatSort {
  return Object.prototype.hasOwnProperty.call(STAT_LABELS, value);
}

export function parseSort(value: string | null): SortKey {
  return value === 'name' || (value && isStatSort(value)) ? value : 'id';
}

export function readBaseStats(stats: { base_stat: number; stat: { name: string } }[]): BaseStats {
  const values = Object.fromEntries(stats.map(({ base_stat, stat }) => [stat.name, base_stat]));
  if (BASE_STATS.some((name) => !Number.isFinite(values[name]) || values[name] < 0)) {
    throw new Error('Pokémon is missing a valid base stat');
  }
  return { ...values, total: BASE_STATS.reduce((sum, name) => sum + values[name], 0) } as BaseStats;
}
