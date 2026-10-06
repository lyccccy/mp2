import axios from 'axios';
import { readBaseStats, type StatIndex } from './stats';

export interface Resource { name: string; url: string }
export interface IndexEntry extends Resource { id: number }
interface ResourceList { count: number; next: string | null; results: Resource[] }
export interface Pokemon {
  id: number;
  name: string;
  height: number;
  weight: number;
  base_experience: number | null;
  types: { slot: number; type: Resource }[];
  abilities: { is_hidden: boolean; ability: Resource }[];
  stats: { base_stat: number; stat: Resource }[];
  species: Resource;
  sprites: {
    front_default: string | null;
    other: { 'official-artwork': { front_default: string | null; front_shiny: string | null } };
  };
}
export interface Species {
  names: { name: string; language: Resource }[];
  evolution_chain: { url: string } | null;
  varieties: { is_default: boolean; pokemon: Resource }[];
  genera: { genus: string; language: Resource }[];
  flavor_text_entries: { flavor_text: string; language: Resource }[];
  habitat: Resource | null;
  generation: Resource;
  capture_rate: number;
  is_legendary: boolean;
  is_mythical: boolean;
}

const client = axios.create({ baseURL: 'https://pokeapi.co/api/v2/', timeout: 20000 });
// Session-only request deduplication. No JSON files, localStorage, IndexedDB,
// service worker, or downloaded dataset: every new page session uses the API.
const requests = new Map<string, Promise<unknown>>();
export function request<T>(endpoint: string): Promise<T> {
  const existing = requests.get(endpoint);
  if (existing) return existing as Promise<T>;
  const pending = client.get<T>(endpoint).then(({ data }) => data).catch((error: unknown) => {
    requests.delete(endpoint);
    throw error;
  });
  requests.set(endpoint, pending);
  return pending;
}

export function resourceId(url: string): number {
  return Number(url.split('/').filter(Boolean).at(-1));
}
export async function getIndex(): Promise<IndexEntry[]> {
  const entries: Resource[] = [];
  let endpoint: string | null = 'pokemon?limit=100000';
  while (endpoint) {
    const page: ResourceList = await request<ResourceList>(endpoint);
    entries.push(...page.results);
    endpoint = page.next;
  }
  return entries.map((entry) => ({ ...entry, id: resourceId(entry.url) }));
}
export async function getTypes(): Promise<Resource[]> {
  const data = await request<ResourceList>('type?limit=100');
  return data.results.filter(({ name }) => name !== 'unknown' && name !== 'shadow');
}
export async function getTypeMembers(type: string): Promise<Set<number>> {
  const data = await request<{ pokemon: { pokemon: Resource }[] }>(`type/${type}`);
  return new Set(data.pokemon.map(({ pokemon }) => resourceId(pokemon.url)));
}
export const getPokemon = (id: string | number) => request<Pokemon>(`pokemon/${id}`);
export const getSpecies = (url: string) => request<Species>(url);
export const artwork = (pokemon: Pokemon, shiny = false) =>
  (shiny ? pokemon.sprites.other['official-artwork'].front_shiny : null)
  || pokemon.sprites.other['official-artwork'].front_default || pokemon.sprites.front_default;
export const displayName = (name: string) => name.replaceAll('-', ' ');
export const numberLabel = (id: number) => `#${String(id).padStart(4, '0')}`;

// Load only the visible page, with at most six simultaneous detail requests.
export async function getPage(entries: IndexEntry[]): Promise<Pokemon[]> {
  const results: Pokemon[] = new Array(entries.length);
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(6, entries.length) }, async () => {
    while (cursor < entries.length) {
      const position = cursor++;
      results[position] = await getPokemon(entries[position].id);
    }
  }));
  return results;
}

let statIndexRequest: Promise<StatIndex> | undefined;

function getStatIndex(): Promise<StatIndex> {
  if (statIndexRequest) return statIndexRequest;
  // The official GraphQL endpoint returns only IDs and six base stats, avoiding
  // more than a thousand large REST detail requests for a global numeric sort.
  statIndexRequest = axios.post<{
    data?: { pokemon: { id: number; pokemonstats: Pokemon['stats'] }[] };
    errors?: { message: string }[];
  }>('https://graphql.pokeapi.co/v1beta2', {
    query: 'query StatIndex { pokemon(order_by: {id: asc}) { id pokemonstats { base_stat stat { name } } } }',
  }, { timeout: 25000 }).then(({ data }) => {
    if (data.errors?.length || !data.data?.pokemon?.length) throw new Error('Unable to load the stat index');
    const index: StatIndex = new Map();
    for (const pokemon of data.data.pokemon) {
      try { index.set(pokemon.id, readBaseStats(pokemon.pokemonstats)); }
      catch { /* Resolve incomplete entries using REST below. */ }
    }
    return index;
  }).catch((error: unknown) => {
    statIndexRequest = undefined;
    throw error;
  });
  return statIndexRequest;
}

export async function getStatsForEntries(entries: IndexEntry[]): Promise<StatIndex> {
  if (!entries.length) return new Map();
  const index = await getStatIndex();
  // REST and GraphQL can be updated at different times. Resolve any missing
  // matching IDs before sorting, rather than treating unknown values as zero.
  const missing = entries.filter(({ id }) => !index.has(id));
  if (missing.length) {
    const records = await getPage(missing);
    for (const pokemon of records) index.set(pokemon.id, readBaseStats(pokemon.stats));
  }
  return index;
}
