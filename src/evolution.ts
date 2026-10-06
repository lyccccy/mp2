import { selectLanguage, type Language, type LocalizedName } from './localization';
import { translate } from './translations';
import { displayName, getPokemon, getSpecies, request, resourceId, type Pokemon, type Resource } from './api';

export interface EvolutionDetail {
  trigger: Resource | null;
  item?: Resource | null;
  held_item?: Resource | null;
  min_level?: number | null;
  min_happiness?: number | null;
  min_beauty?: number | null;
  min_affection?: number | null;
  gender?: number | null;
  time_of_day?: string;
  known_move?: Resource | null;
  known_move_type?: Resource | null;
  location?: Resource | null;
  party_species?: Resource | null;
  party_type?: Resource | null;
  trade_species?: Resource | null;
  relative_physical_stats?: number | null;
  needs_overworld_rain?: boolean;
  turn_upside_down?: boolean;
  near_special_rock?: boolean;
  needs_multiplayer?: boolean;
  region?: Resource | null;
  required_pokemon_form?: Resource | null;
  evolved_pokemon_form?: Resource | null;
  version_group?: Resource | null;
  used_move?: Resource | null;
  min_move_count?: number | null;
  min_steps?: number | null;
  min_damage_taken?: number | null;
  allowed_natures?: Resource[] | null;
  condition_expression?: { expression: string; percentage_chance: number | null; variables: Resource[] } | null;
}
export interface EvolutionNode {
  species: Resource;
  evolution_details: EvolutionDetail[];
  evolves_to: EvolutionNode[];
}

// Keep each root-to-leaf path separate: siblings never appear as evolutions of one another.
export function evolutionPaths(node: EvolutionNode): EvolutionNode[][] {
  return node.evolves_to.length
    ? node.evolves_to.flatMap((child) => evolutionPaths(child).map((path) => [node, ...path]))
    : [[node]];
}

export interface EvolutionText {
  t: (text: string, values?: Record<string, string | number>) => string;
  name: (resource: Resource) => string;
}
const defaultText: EvolutionText = { t: (text, values) => translate('en', text, values), name: (resource) => displayName(resource.name) };

export function evolutionSummary(detail?: EvolutionDetail, text: EvolutionText = defaultText): string {
  if (!detail) return text.t('Special evolution');
  if (detail.trigger?.name === 'level-up' && detail.min_level != null) return text.t('Level {level}+', { level: detail.min_level });
  if (detail.item) return text.t('Use {item}', { item: text.name(detail.item) });
  return detail.trigger ? text.t(text.name(detail.trigger)) : text.t('Special evolution');
}

export function evolutionConditions(detail: EvolutionDetail, text: EvolutionText = defaultText): string {
  const conditions = [evolutionSummary(detail, text)];
  const resourceConditions: [keyof EvolutionDetail, string][] = [
    ['held_item', 'Holding'], ['known_move', 'Knows'], ['known_move_type', 'Knows a move of type'],
    ['location', 'At'], ['party_species', 'In party:'], ['party_type', 'Party includes type'],
    ['trade_species', 'Trade for'], ['region', 'In region'], ['required_pokemon_form', 'From form:'],
    ['evolved_pokemon_form', 'To form:'], ['used_move', 'Use move:'],
  ];
  for (const [key, label] of resourceConditions) {
    const value = detail[key] as Resource | null | undefined;
    if (value) conditions.push(`${text.t(label)} ${text.name(value)}`);
  }
  const thresholds: [keyof EvolutionDetail, string][] = [
    ['min_happiness', 'Friendship'], ['min_beauty', 'Beauty'], ['min_affection', 'Affection'],
    ['min_move_count', 'Move uses'], ['min_steps', 'Steps'], ['min_damage_taken', 'Damage taken'],
  ];
  for (const [key, label] of thresholds) {
    const value = detail[key];
    if (value != null) conditions.push(`${text.t(label)} ≥ ${value}`);
  }
  if (detail.min_level != null && detail.trigger?.name !== 'level-up') conditions.push(text.t('Level {level}+', { level: detail.min_level }));
  if (detail.gender != null) conditions.push(text.t(detail.gender === 1 ? 'Female' : detail.gender === 2 ? 'Male' : 'Genderless'));
  if (detail.time_of_day) conditions.push(text.t(displayName(detail.time_of_day)));
  if (detail.relative_physical_stats != null) conditions.push(`${text.t('Attack')} ${detail.relative_physical_stats === 1 ? '>' : detail.relative_physical_stats === -1 ? '<' : '='} ${text.t('Defense')}`);
  if (detail.needs_overworld_rain) conditions.push(text.t('Overworld rain'));
  if (detail.turn_upside_down) conditions.push(text.t('Device upside down'));
  if (detail.near_special_rock) conditions.push(text.t('Near a special rock'));
  if (detail.needs_multiplayer) conditions.push(text.t('Multiplayer required'));
  if (detail.allowed_natures?.length) conditions.push(`${text.t('Nature:')} ${detail.allowed_natures.map(text.name).join(' / ')}`);
  if (detail.condition_expression) {
    const rule = detail.condition_expression;
    conditions.push(`${text.t('Special condition:')} ${rule.variables.map(text.name).join(', ') || rule.expression}`);
    if (rule.percentage_chance != null) conditions.push(text.t('{chance}% chance', { chance: rule.percentage_chance }));
  }
  if (detail.version_group) conditions.push(text.t('Introduced in {version}', { version: text.name(detail.version_group) }));
  return conditions.join(' · ');
}

export async function getEvolutionFamily(url: string) {
  const { chain } = await request<{ chain: EvolutionNode }>(url);
  const paths = evolutionPaths(chain);
  const species = [...new Map(paths.flat().map((node) => [node.species.url, node.species])).values()];
  const pokemon = new Map<string, Pokemon>();
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(6, species.length) }, async () => {
    while (cursor < species.length) {
      const entry = species[cursor++];
      const record = await getSpecies(entry.url);
      const defaultForm = record.varieties.find((variety) => variety.is_default);
      if (!defaultForm) throw new Error('Species has no default Pokémon form');
      // Species IDs/names are not interchangeable with Pokémon varieties.
      pokemon.set(entry.url, await getPokemon(resourceId(defaultForm.pokemon.url)));
    }
  }));
  return { paths, pokemon };
}

// Fetch only the named resources referenced by this family, using the same
// session-only REST cache as the rest of the app. Missing names keep the API slug.
export async function getEvolutionResourceNames(paths: EvolutionNode[][]) {
  const resources = new Map<string, Resource>();
  for (const node of paths.flat()) {
    for (const detail of node.evolution_details) {
      for (const value of Object.values(detail)) {
        const candidates = Array.isArray(value) ? value : [value];
        for (const candidate of candidates) {
          if (candidate && typeof candidate === 'object' && 'url' in candidate && 'name' in candidate) {
            resources.set(candidate.url, candidate as Resource);
          }
        }
      }
    }
  }
  const labels = new Map<string, LocalizedName[]>();
  const entries = [...resources.values()];
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(6, entries.length) }, async () => {
    while (cursor < entries.length) {
      const entry = entries[cursor++];
      const data = await request<{ names?: LocalizedName[]; form_names?: LocalizedName[] }>(entry.url);
      labels.set(entry.url, data.names?.length ? data.names : data.form_names || []);
    }
  }));
  return labels;
}

export function evolutionResourceName(labels: Map<string, LocalizedName[]> | undefined, language: Language, resource: Resource) {
  return selectLanguage(labels?.get(resource.url) || [], language)?.name || displayName(resource.name);
}
