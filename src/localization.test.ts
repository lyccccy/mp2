import { describe, expect, it } from 'vitest';
import { filterAndSort } from './catalog';
import { localizedPokemonName, parseLanguage, selectLanguage, withLanguage, type NameIndex } from './localization';
import { translate } from './translations';

const localized = (name: string, language: string) => ({ name, language: { name: language, url: '' } });
describe('language switching', () => {
  it('selects the exact language, Japanese kana, then English without arbitrary fallback', () => {
    const entries = [localized('English', 'en'), localized('简体', 'zh-hans'), localized('繁體', 'zh-hant'), localized('かな', 'ja-hrkt')];
    expect(selectLanguage(entries, 'zh-hans')?.name).toBe('简体');
    expect(selectLanguage(entries, 'zh-hant')?.name).toBe('繁體');
    expect(selectLanguage(entries, 'ja')?.name).toBe('かな');
    expect(selectLanguage([entries[0]], 'zh-hans')?.name).toBe('English');
    expect(selectLanguage([localized('Français', 'fr')], 'ja')).toBeUndefined();
    expect(parseLanguage('invalid')).toBe('en');
  });
  it('preserves the current route, query, and hash while replacing language', () => {
    expect(withLanguage('/pokemon/25?lang=ja#main', 'zh-hans')).toBe('/pokemon/25?lang=zh-hans#main');
    expect(withLanguage('/list?q=pika&sort=hp&order=desc&lang=ja', 'en')).toBe('/list?q=pika&sort=hp&order=desc');
    expect(withLanguage('/?types=water&page=2', 'ja')).toBe('/?types=water&page=2&lang=ja');
  });
  it('retains form qualifiers and searches localized names alongside English names and IDs', () => {
    const species = { name: 'pikachu', names: [localized('皮卡丘', 'zh-hans')] };
    const index: NameIndex = { pokemon: new Map([
      [25, { id: 25, name: 'pikachu', is_default: true, species }],
      [10080, { id: 10080, name: 'pikachu-rock-star', is_default: false, species }],
    ]), species: new Map(), resources: new Map() };
    const name = (id: number, fallback: string) => localizedPokemonName(index, 'zh-hans', id, fallback);
    expect(name(25, 'pikachu')).toBe('皮卡丘');
    expect(name(10080, 'pikachu-rock-star')).toBe('皮卡丘 (pikachu rock star)');
    const entries = [{ id: 25, name: 'pikachu', url: '' }, { id: 1, name: 'bulbasaur', url: '' }];
    for (const query of ['皮卡', 'pika', '#0025']) {
      expect(filterAndSort(entries, query, 'name', false, [], undefined, name, 'zh-Hans').map((entry) => entry.id)).toEqual([25]);
    }
  });
  it('translates interface copy and interpolates complete sentences', () => {
    expect(translate('zh-hans', 'Attack')).toBe('攻击');
    expect(translate('zh-hant', 'Attack')).toBe('攻擊');
    expect(translate('ja', 'Attack')).toBe('こうげき');
    expect(translate('en', 'Attack')).toBe('Attack');
    expect(translate('zh-hans', 'Page {page} of {pages}', { page: 2, pages: 9 })).toBe('第 2 / 9 页');
  });
});
