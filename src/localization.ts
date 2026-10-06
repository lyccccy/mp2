import axios from 'axios';
import { displayName, type Resource } from './api';

export const LANGUAGES = { en: 'English', 'zh-hans': '简体中文', 'zh-hant': '繁體中文', ja: '日本語' } as const;
export type Language = keyof typeof LANGUAGES;
export const languageLocale = (language: Language) => ({ en: 'en', 'zh-hans': 'zh-Hans', 'zh-hant': 'zh-Hant', ja: 'ja' })[language];
export function parseLanguage(value: string | null): Language {
  return value && Object.hasOwn(LANGUAGES, value) ? value as Language : 'en';
}
export interface LocalizedName { name: string; language: Resource }
export function selectLanguage<T extends { language: Resource }>(entries: T[], language: Language): T | undefined {
  const preferred = language === 'ja' ? ['ja', 'ja-hrkt', 'en'] : [language, 'en'];
  for (const code of preferred) {
    const match = entries.find((entry) => entry.language.name === code);
    if (match) return match;
  }
  return undefined;
}
interface NamedRecord { name: string; names: LocalizedName[] }
interface LocalizedPokemon {
  id: number; name: string; is_default: boolean;
  species: { name: string; names: LocalizedName[] };
}
export interface NameIndex {
  pokemon: Map<number, LocalizedPokemon>;
  resources: Map<string, LocalizedName[]>;
  species: Map<string, LocalizedName[]>;
}
let nameRequest: Promise<NameIndex> | undefined;
export function getNameIndex(): Promise<NameIndex> {
  if (nameRequest) return nameRequest;
  // All translations come from the live API. This index is only held in memory.
  nameRequest = axios.post<{ data?: {
    pokemon: LocalizedPokemon[]; types: NamedRecord[]; stats: NamedRecord[]; abilities: NamedRecord[];
  }; errors?: unknown[] }>('https://graphql.pokeapi.co/v1beta2', {
    query: `query LocalizedNames {
      pokemon { id name is_default species: pokemonspecy { name names: pokemonspeciesnames { name language { name } } } }
      types: type { name names: typenames { name language { name } } }
      stats: stat { name names: statnames { name language { name } } }
      abilities: ability { name names: abilitynames { name language { name } } }
    }`,
  }, { timeout: 25000 }).then(({ data }) => {
    if (data.errors?.length || !data.data) throw new Error('Localized names unavailable');
    const result: NameIndex = { pokemon: new Map(), resources: new Map(), species: new Map() };
    for (const pokemon of data.data.pokemon) {
      result.pokemon.set(pokemon.id, pokemon);
      result.species.set(pokemon.species.name, pokemon.species.names);
    }
    for (const [kind, records] of [['type', data.data.types], ['stat', data.data.stats], ['ability', data.data.abilities]] as const) {
      for (const record of records) result.resources.set(`${kind}/${record.name}`, record.names);
    }
    return result;
  }).catch((error: unknown) => { nameRequest = undefined; throw error; });
  return nameRequest;
}

export function localizedPokemonName(index: NameIndex | undefined, language: Language, id: number, fallback: string): string {
  const pokemon = index?.pokemon.get(id);
  if (!pokemon) return displayName(fallback);
  const translated = selectLanguage(pokemon.species.names, language)?.name;
  if (!translated) return displayName(fallback);
  // Species translations don't translate form qualifiers. Keep the API form name
  // visible so Mega, regional, and cosmetic forms remain distinguishable.
  return pokemon.is_default ? translated : `${translated} (${displayName(pokemon.name)})`;
}

export function withLanguage(to: string, language: Language): string {
  const hashIndex = to.indexOf('#');
  const hash = hashIndex >= 0 ? to.slice(hashIndex) : '';
  const path = hashIndex >= 0 ? to.slice(0, hashIndex) : to;
  const [pathname, search = ''] = path.split('?');
  const params = new URLSearchParams(search);
  if (language === 'en') params.delete('lang'); else params.set('lang', language);
  return pathname + (params.size ? `?${params}` : '') + hash;
}
