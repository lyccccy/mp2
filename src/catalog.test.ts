import { describe, expect, it } from 'vitest';
import { filterAndSort, neighbors } from './catalog';
import type { IndexEntry } from './api';
import { BASE_STATS, parseSort, readBaseStats, type StatIndex } from './stats';

const entries: IndexEntry[] = [
  { id: 25, name: 'pikachu', url: '' },
  { id: 1, name: 'bulbasaur', url: '' },
  { id: 6, name: 'charizard', url: '' },
  { id: 10080, name: 'pikachu-rock-star', url: '' },
];
describe('catalog interactions', () => {
  it('searches the full index by partial name, formatted number, or form name', () => {
    expect(filterAndSort(entries, 'PIKA', 'id', false).map((entry) => entry.id)).toEqual([25, 10080]);
    expect(filterAndSort(entries, '#0025', 'id', false).map((entry) => entry.id)).toEqual([25]);
    expect(filterAndSort(entries, 'rock star', 'id', false).map((entry) => entry.id)).toEqual([10080]);
  });
  it('sorts numerically and alphabetically in both directions without mutating the index', () => {
    expect(filterAndSort(entries, '', 'id', false).map((entry) => entry.id)).toEqual([1, 6, 25, 10080]);
    expect(filterAndSort(entries, '', 'id', true).map((entry) => entry.id)).toEqual([10080, 25, 6, 1]);
    expect(filterAndSort(entries, '', 'name', false).map((entry) => entry.name)).toEqual(['bulbasaur', 'charizard', 'pikachu', 'pikachu-rock-star']);
    expect(filterAndSort(entries, '', 'name', true).map((entry) => entry.name)).toEqual(['pikachu-rock-star', 'pikachu', 'charizard', 'bulbasaur']);
    expect(entries[0].id).toBe(25);
  });
  it('combines type selections with OR and intersects them with the current search', () => {
    expect(filterAndSort(entries, '', 'id', false, [new Set([25]), new Set([1])]).map((entry) => entry.id)).toEqual([1, 25]);
    expect(filterAndSort(entries, 'pika', 'id', false, [new Set([1])])).toEqual([]);
    expect(filterAndSort(entries, 'missing', 'id', false)).toEqual([]);
  });
  it('cycles through the current result order and handles a direct URL or single result', () => {
    expect(neighbors([25, 6, 1], 25)).toEqual({ previous: 1, next: 6 });
    expect(neighbors([25, 6, 1], 1)).toEqual({ previous: 6, next: 25 });
    expect(neighbors([25], 25)).toEqual({ previous: undefined, next: undefined });
    expect(neighbors([], 25)).toEqual({ previous: undefined, next: undefined });
  });
  it('sorts every base stat and the total numerically before pagination, with stable ties', () => {
    const stats: StatIndex = new Map(entries.map((entry, index) => [entry.id, readBaseStats(
      BASE_STATS.map((name) => ({ base_stat: [90, 10, 90, 5][index], stat: { name } })),
    )]));
    for (const key of [...BASE_STATS, 'total']) {
      expect(filterAndSort(entries, '', key, false, [], stats).map(({ id }) => id)).toEqual([10080, 1, 6, 25]);
      expect(filterAndSort(entries, '', key, true, [], stats).map(({ id }) => id)).toEqual([6, 25, 1, 10080]);
      expect(filterAndSort(entries, 'pika', key, false, [], stats).map(({ id }) => id)).toEqual([10080, 25]);
      expect(filterAndSort(entries, '', key, true, [new Set([1, 10080])], stats).map(({ id }) => id)).toEqual([1, 10080]);
    }
    expect(stats.get(25)?.total).toBe(540);
    expect(() => filterAndSort(entries, '', 'hp', false, [], new Map())).toThrow('Load all matching base stats');
  });
  it('reads stats by name, sums exactly six base stats, and validates URL sort keys', () => {
    const stats = readBaseStats(BASE_STATS.map((name, index) => ({ base_stat: index + 10, stat: { name } })).reverse());
    expect(stats.hp).toBe(10);
    expect(stats.speed).toBe(15);
    expect(stats.total).toBe(75);
    expect(() => readBaseStats([{ base_stat: 42, stat: { name: 'hp' } }])).toThrow();
    expect(parseSort('special-defense')).toBe('special-defense');
    expect(parseSort('constructor')).toBe('id');
    expect(parseSort(null)).toBe('id');
  });
});
