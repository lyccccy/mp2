import { describe, expect, it } from 'vitest';
import { evolutionConditions, evolutionPaths, type EvolutionNode } from './evolution';

const node = (name: string, children: EvolutionNode[] = []): EvolutionNode => ({
  species: { name, url: name }, evolution_details: [], evolves_to: children,
});
const resource = (name: string) => ({ name, url: name });

describe('evolution relationships', () => {
  it('keeps linear stages in order and separates sibling branches', () => {
    const root = node('root', [node('middle', [node('leaf-a'), node('leaf-b')]), node('other')]);
    expect(evolutionPaths(root).map((path) => path.map((entry) => entry.species.name))).toEqual([
      ['root', 'middle', 'leaf-a'], ['root', 'middle', 'leaf-b'], ['root', 'other'],
    ]);
    expect(evolutionPaths(node('single'))).toHaveLength(1);
    expect(evolutionPaths(node('single'))[0]).toHaveLength(1);
  });
  it('preserves simultaneous conditions, including zero-valued relative stats', () => {
    const description = evolutionConditions({ trigger: resource('level-up'), min_level: 20, min_happiness: 160,
      relative_physical_stats: 0, gender: 1, time_of_day: 'night', held_item: resource('razor-claw') });
    for (const condition of ['Level 20+', 'Friendship ≥ 160', 'Attack = Defense', 'Female', 'night', 'Holding razor claw']) {
      expect(description).toContain(condition);
    }
  });
  it('distinguishes item, trade, form, and game conditions', () => {
    expect(evolutionConditions({ trigger: resource('use-item'), item: resource('water-stone') })).toBe('Use water stone');
    const trade = evolutionConditions({ trigger: resource('trade'), held_item: resource('metal-coat'),
      required_pokemon_form: resource('onix'), version_group: resource('gold-silver') });
    expect(trade).toContain('trade · Holding metal coat');
    expect(trade).toContain('From form: onix');
    expect(trade).toContain('Introduced in gold silver');
  });
});
