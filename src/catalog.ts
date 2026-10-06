import type { IndexEntry } from './api';
import { isStatSort, type StatIndex } from './stats';

export function filterAndSort(
  entries: IndexEntry[], query: string, sort: string, descending: boolean,
  typeSets: Set<number>[] = [], stats?: StatIndex,
  localizedName?: (id: number, fallback: string) => string, locale = 'en',
): IndexEntry[] {
  const normalized = query.trim().toLowerCase().replace(/^#/, '').replaceAll(' ', '-');
  return entries.filter((entry) => {
    const matchesQuery = entry.name.includes(normalized)
      || Boolean(localizedName?.(entry.id, entry.name).toLocaleLowerCase(locale).includes(query.trim().toLocaleLowerCase(locale)))
      || String(entry.id).padStart(4, '0').includes(normalized);
    return matchesQuery && (!typeSets.length || typeSets.some((ids) => ids.has(entry.id)));
  }).sort((a, b) => {
    let difference: number;
    if (isStatSort(sort)) {
      const left = stats?.get(a.id)?.[sort];
      const right = stats?.get(b.id)?.[sort];
      if (left === undefined || right === undefined) throw new Error('Load all matching base stats before sorting');
      difference = left - right;
    } else {
      difference = sort === 'name' ? (localizedName?.(a.id, a.name) || a.name).localeCompare(localizedName?.(b.id, b.name) || b.name, locale) : a.id - b.id;
    }
    // A stable ID tie-break makes equal-stat entries predictable across pages.
    return difference * (descending ? -1 : 1) || a.id - b.id;
  });
}

export function neighbors(ids: number[], current: number) {
  const index = ids.indexOf(current);
  if (index < 0 || ids.length < 2) return { previous: undefined, next: undefined };
  return {
    previous: ids[(index - 1 + ids.length) % ids.length],
    next: ids[(index + 1) % ids.length],
  };
}
