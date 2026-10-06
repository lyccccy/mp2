import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, BookOpen, Check, ChevronLeft, ChevronRight, CircleHelp, Compass, Grid2X2, List, LoaderCircle, Search, Shuffle, SlidersHorizontal, Sparkles, X, Zap } from 'lucide-react';
import { displayName, getIndex, getPage, getPokemon, getSpecies, getStatsForEntries, getTypeMembers, getTypes, numberLabel, type IndexEntry } from './api';
import { filterAndSort, neighbors } from './catalog';
import { useRemote } from './hooks';
import PokemonCard, { PokemonImage, TypeBadge, TypeIcon } from './components/PokemonCard';
import EvolutionFamily from './components/EvolutionFamily';
import { Link, NavLink, useLocale } from './i18n';
import { LANGUAGES, selectLanguage, type Language } from './localization';
import { isStatSort, parseSort, STAT_LABELS, type StatIndex } from './stats';

const CatalogContext = createContext<ReturnType<typeof useRemote<IndexEntry[]>> | null>(null);
const useCatalog = () => useContext(CatalogContext)!;
const PAGE_SIZE = 18;

function Status({ error, retry, label = 'Finding Pokémon…' }: { error?: string; retry?: () => void; label?: string }) {
  const { t } = useLocale();
  return <div className={`status-panel ${error ? 'error-panel' : ''}`} role={error ? 'alert' : 'status'}>
    {error ? <CircleHelp size={30} /> : <LoaderCircle className="spinner" size={28} />}
    <p>{t(error || label)}</p>{error && retry && <button className="button secondary" onClick={retry}>{t("Try again")} <ArrowRight size={16} /></button>}
  </div>;
}

function Header() {
  const { t, language, setLanguage, href } = useLocale();
  const catalog = useCatalog();
  const navigate = useNavigate();
  const location = useLocation();
  function surprise() {
    if (!catalog.data?.length) return;
    const pokemon = catalog.data[Math.floor(Math.random() * catalog.data.length)];
    navigate(href(`/pokemon/${pokemon.id}`));
  }
  return <header className="site-header"><div className="header-inner">
    <Link to="/" className="brand" aria-label={t('Pokédex home')}><span className="brand-icon"><span /></span>{t("pokédex")}<span className="brand-period">.</span></Link>
    <nav aria-label={t('Main navigation')}><NavLink to="/" end className={location.pathname === '/list' ? 'active' : undefined}><Compass size={17} />{t("Explore")}</NavLink><NavLink to="/about"><BookOpen size={17} />{t("Field notes")}</NavLink></nav>
    <div className="header-actions"><label className="language-picker"><span className="sr-only">{t("Language")}</span><select aria-label={t("Language")} value={language} onChange={(event) => setLanguage(event.target.value as Language)}>{Object.entries(LANGUAGES).map(([code, label]) => <option key={code} value={code}>{label}</option>)}</select></label><button className="surprise-button" onClick={surprise} disabled={!catalog.data?.length}><Shuffle size={16} /><span>{t("Surprise me")}</span><ArrowUpRightIcon /></button></div>
  </div></header>;
}

function ArrowUpRightIcon() { return <span aria-hidden="true">↗</span>; }

function Hero() {
  const { t, name } = useLocale();
  const featured = useRemote('featured-25', () => getPokemon(25));
  return <section className="hero">
    <div className="device-lights" aria-hidden="true"><span className="device-lens" /><span /><span /><span /></div>
    <span className="device-speaker" aria-hidden="true"><i /><i /><i /></span>
    <div className="hero-copy"><div className="eyebrow"><span /> {t("THE POKÉMON FIELD GUIDE")}</div>
      <h1>{t("A world of Pokémon.")}<br /><span>{t("Yours to discover.")}</span></h1>
      <p>{t("Every type. Every little detail. Find a familiar face")}<br className="desktop-break" /> {t("or meet your next favorite Pokémon.")}</p>
      <a className="hero-explore" href="#explore-title"><span className="mini-ball" />{t("Let’s explore")}<ArrowRight size={18} /></a>
      <div className="hero-note">{t("Big adventures start with a little curiosity.")}</div>
    </div>
    <div className="hero-illustration"><div className="hero-ring ring-one" /><div className="hero-ring ring-two" /><span className="hero-spark spark-one">✧</span><span className="hero-spark spark-two">✦</span>
      <span className="hero-label">{t("SMALL POKÉMON.")}<br />{t("BIG PERSONALITY.")}</span>
      {featured.data ? <Link to="/pokemon/25" className="hero-pokemon" aria-label={t("View {name}, {number}", { name: name(25, "pikachu"), number: "#0025" })}><PokemonImage pokemon={featured.data} /></Link> : <Zap className="hero-placeholder" size={110} />}
      <Link className="featured-tag" to="/pokemon/25"><span className="featured-bolt"><Zap size={18} /></span><span><small>{t("MEET THE CLASSICS")}</small><strong>{name(25, 'Pikachu')} <span>#0025</span></strong></span><ArrowUpRightIcon /></Link>
    </div>
  </section>;
}

function Browse() {
  const { t, name, resource, locale, namesLoading } = useLocale();
  const catalog = useCatalog();
  const types = useRemote('types', getTypes);
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const isList = location.pathname === '/list';
  const query = params.get('q') || '';
  const sort = parseSort(params.get('sort'));
  const statSort = isStatSort(sort) ? sort : undefined;
  const descending = params.get('order') === 'desc';
  const selected = [...new Set((params.get('types') || '').split(',').filter((name) => /^[a-z]+$/.test(name)))];
  const typeKey = [...selected].sort().join(',');
  const typeMembers = useRemote(`types:${typeKey}`, () => Promise.all(selected.map(getTypeMembers)));
  const matches = useMemo(() => filterAndSort(catalog.data || [], query, 'id', false, typeMembers.data || [], undefined, name, locale), [catalog.data, query, typeMembers.data, name, locale]);
  const indexReady = !namesLoading && !catalog.loading && !typeMembers.loading && !catalog.error && !typeMembers.error;
  const statEntries = statSort && indexReady ? matches : [];
  const numericStats = useRemote(`stats:${statEntries.map(({ id }) => id).join(',')}`, () => statEntries.length ? getStatsForEntries(statEntries) : Promise.resolve<StatIndex>(new Map()));
  const statsLoading = Boolean(statSort && numericStats.loading);
  const filtered = useMemo(() => statSort && (!indexReady || !numericStats.data) ? matches : filterAndSort(matches, '', sort, descending, [], numericStats.data, name, locale), [matches, sort, statSort, indexReady, descending, numericStats.data, name, locale]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const requestedPage = Number(params.get('page'));
  const page = Math.min(totalPages, Number.isFinite(requestedPage) ? Math.max(1, Math.floor(requestedPage)) : 1);
  const ready = indexReady && !statsLoading && !(statSort && numericStats.error);
  const visible = ready ? filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE) : [];
  const pageData = useRemote(`page:${visible.map(({ id }) => id).join(',')}`, () => getPage(visible));
  const loading = namesLoading || catalog.loading || typeMembers.loading || statsLoading || pageData.loading;
  const error = catalog.error || typeMembers.error || (statSort && numericStats.error) || pageData.error;
  function update(key: string, value: string) {
    setParams((previous) => {
      const next = new URLSearchParams(previous);
      if (value) next.set(key, value); else next.delete(key);
      if (key !== 'page') next.delete('page');
      return next;
    }, { replace: true });
  }
  function toggleType(name: string) {
    update('types', selected.includes(name) ? selected.filter((item) => item !== name).join(',') : [...selected, name].join(','));
  }
  function reset() { setParams((previous) => { const next = new URLSearchParams(); const lang = previous.get('lang'); if (lang) next.set('lang', lang); return next; }); }
  const backTo = location.pathname + location.search;
  const sequence = filtered.map(({ id }) => id);
  return <><Hero /><section className="explore-section" aria-labelledby="explore-title">
    <div className="section-heading"><div><span className="eyebrow">{t("THE COLLECTION")}</span><h2 id="explore-title">{t("Find your Pokémon")}<span className="heading-dot">.</span></h2></div><span className="collection-count"><span />{catalog.data ? t("{count} Pokémon & forms", { count: catalog.data.length.toLocaleString(locale) }) : t("Connecting to PokéAPI")}</span></div>
    <div className="explore-layout"><aside className="filters"><div className="filter-title"><SlidersHorizontal size={17} /><h3>{t("Filter by type")}</h3>{selected.length > 0 && <button onClick={() => update('types', '')} className="text-button">{t("Clear")}</button>}</div><p className="filter-hint">{t("Pick one or more to explore.")}</p>
      <button className={`all-types ${!selected.length ? 'selected' : ''}`} onClick={() => update('types', '')}><Grid2X2 size={16} />{t("All types")}{!selected.length && <Check size={15} />}</button>
      {types.error ? <Status error={types.error} retry={types.retry} /> : <div className="type-options">{types.data?.map(({ name }) => <button key={name} className={`type-option type-${name} ${selected.includes(name) ? 'selected' : ''}`} aria-pressed={selected.includes(name)} onClick={() => toggleType(name)}><TypeIcon name={name} /><span>{resource("type", name)}</span><span className="type-checkbox">{selected.includes(name) && <Check size={11} />}</span></button>)}</div>}
      <div className="field-tip"><Sparkles size={21} /><h4>{t("A little field wisdom")}</h4><p>{t("Some Pokémon have two types. Select a few to discover Pokémon of any selected type.")}</p><span>{t("STAY CURIOUS ↗")}</span></div>
    </aside><div className="results-area">
      <div className="search-sort"><label className="search-box"><Search size={19} /><span className="sr-only">{t("Search Pokémon by name or number")}</span><input value={query} onChange={(event) => update('q', event.target.value)} placeholder={t('Search by name or number…')} />{query && <button aria-label={t('Clear search')} onClick={() => update('q', '')}><X size={16} /></button>}</label>
        <div className="sort-controls"><label htmlFor="sort">{t("Sort by")}</label><select id="sort" value={sort} onChange={(event) => update('sort', event.target.value)}><option value="id">{t("Pokédex number")}</option><option value="name">{t("Name")}</option>{Object.entries(STAT_LABELS).map(([key, label]) => <option key={key} value={key}>{t(label)}</option>)}</select><button className="order-button" onClick={() => update('order', descending ? 'asc' : 'desc')} aria-label={t(descending ? 'Descending order; switch to ascending' : 'Ascending order; switch to descending')} title={t(descending ? 'Descending' : 'Ascending')}>{descending ? <ArrowDown size={18} /> : <ArrowUp size={18} />}</button></div>
      </div>
      <div className="results-toolbar"><p role="status">{loading ? t('Exploring the Pokédex…') : <><strong>{filtered.length.toLocaleString()}</strong> {t("Pokémon found")}{selected.length > 0 && <span> · {selected.map((type) => resource('type', type)).join(' + ')}</span>}</>}</p><div className="view-toggle" aria-label={t('Display view')}><Link to={`/${location.search}`} aria-label={t('Gallery view')} aria-current={!isList ? 'page' : undefined} className={!isList ? 'selected' : ''}><Grid2X2 size={17} /><span>{t("Gallery")}</span></Link><Link to={`/list${location.search}`} aria-label={t('List view')} aria-current={isList ? 'page' : undefined} className={isList ? 'selected' : ''}><List size={18} /><span>{t("List")}</span></Link></div></div>
      {statsLoading && indexReady && <p className="stat-loading" role="status">{t("Loading base stats to sort all {count} matching Pokémon…", { count: matches.length.toLocaleString(locale) })}</p>}
      {error ? <Status error={error} retry={() => { catalog.retry(); typeMembers.retry(); numericStats.retry(); pageData.retry(); }} /> : loading ? <div className="pokemon-grid" aria-label={t('Loading Pokémon')} aria-busy="true">{Array.from({ length: 6 }, (_, index) => <div key={index} className="skeleton-card"><div /><span /><span /></div>)}</div> : !filtered.length ? <div className="empty-state"><Search size={34} /><h3>{t("No Pokémon in sight.")}</h3><p>{t("Try another name, number, or type. Your next discovery is out there.")}</p><button className="button" onClick={reset}>{t("Reset filters")} <ArrowRight size={17} /></button></div> : <>
        {isList && <div className="list-head"><span>{t("Pokémon")}</span><span>{t("Type")}</span><span>{t("Height")}</span><span>{t("Weight")}</span></div>}
        <div className={isList ? 'pokemon-list' : 'pokemon-grid'}>{pageData.data?.map((pokemon) => <PokemonCard key={pokemon.id} pokemon={pokemon} list={isList} sequence={sequence} backTo={backTo} statSort={statSort} statValue={statSort ? numericStats.data?.get(pokemon.id)?.[statSort] : undefined} />)}</div>
        <div className="pagination"><span>{t("Showing {from}–{to} of {total}", { from: (page - 1) * PAGE_SIZE + 1, to: Math.min(page * PAGE_SIZE, filtered.length), total: filtered.length })}</span><div><button aria-label={t('Previous page')} disabled={page === 1} onClick={() => update('page', String(page - 1))}><ChevronLeft size={18} /></button><span>{t("Page {page} of {pages}", { page, pages: totalPages })}</span><button aria-label={t('Next page')} disabled={page === totalPages} onClick={() => update('page', String(page + 1))}><ChevronRight size={18} /></button></div></div>
      </>}
    </div></div>
  </section></>;
}

function Detail() {
  const { t, name, resource, language } = useLocale();
  const { id = '' } = useParams();
  const catalog = useCatalog();
  const location = useLocation();
  const [shiny, setShiny] = useState(false);
  const pokemon = useRemote(`pokemon:${id}`, () => getPokemon(id));
  const species = useRemote(`species:${pokemon.data?.species.url || ''}`, () => pokemon.data ? getSpecies(pokemon.data.species.url) : Promise.resolve(null));
  const navigation = location.state as { sequence?: number[]; backTo?: string } | null;
  const sequence = Array.isArray(navigation?.sequence) ? navigation.sequence : catalog.data?.map((entry) => entry.id) || [];
  const adjacent = neighbors(sequence, pokemon.data?.id || Number(id));
  const backTo = navigation?.backTo?.startsWith('/') ? navigation.backTo : '/';
  useEffect(() => { setShiny(false); window.scrollTo(0, 0); }, [id]);
  const item = pokemon.data;
  const genus = selectLanguage(species.data?.genera || [], language)?.genus;
  const descriptionEntry = selectLanguage(species.data?.flavor_text_entries || [], language);
  const description = descriptionEntry?.flavor_text.replace(/[\n\f\r]/g, ' ');
  return <section className="detail-page"><Link className="back-link" to={backTo}><ArrowLeft size={17} />{t("Back to collection")}</Link>
    {pokemon.error ? <Status error={`This Pokémon could not be loaded. The address may be invalid, or PokéAPI may be unavailable.`} retry={pokemon.retry} /> : !item ? <Status label="Getting to know this Pokémon…" /> : <>
      <div className={`detail-layout palette-${item.types[0]?.type.name}`}><div className="detail-art"><span className="detail-watermark">{numberLabel(item.id)}</span><div className="detail-orbit" /><PokemonImage pokemon={item} shiny={shiny} />{item.sprites.other['official-artwork'].front_shiny && <button className={`shiny-button ${shiny ? 'selected' : ''}`} aria-pressed={shiny} onClick={() => setShiny(!shiny)}><Sparkles size={17} />{shiny ? t('Shiny appearance') : t('Show shiny')}</button>}</div>
      <div className="detail-copy"><span className="eyebrow">{t("POKÉMON FIELD NOTES")} <span> / {numberLabel(item.id)}</span></span><h1>{name(item.id, item.name)}</h1><p className="genus">{genus || t('A new discovery awaits.')}</p><div className="detail-types">{item.types.map(({ type }) => <TypeBadge key={type.name} name={type.name} />)}{species.data?.is_legendary && <span className="special-badge">{t("Legendary")}</span>}{species.data?.is_mythical && <span className="special-badge">{t("Mythical")}</span>}</div>
      {species.error ? <div className="species-error"><p>{t("Extra field notes are unavailable.")}</p><button className="text-button" onClick={species.retry}>{t("Retry field notes")}</button></div> : <p className="description" lang={descriptionEntry?.language.name}>{species.loading ? t('Looking up field notes…') : description || t('No description is available for this Pokémon.')}</p>}
      {descriptionEntry && descriptionEntry.language.name === "en" && language !== "en" && <p className="translation-fallback">{t("Translation unavailable; showing English.")}</p>}
      <dl className="measurements"><div><dt>{t("HEIGHT")}</dt><dd>{item.height / 10}<span> {t("m")}</span></dd></div><div><dt>{t("WEIGHT")}</dt><dd>{item.weight / 10}<span> {t("kg")}</span></dd></div><div><dt>{t("HABITAT")}</dt><dd className="habitat">{t(displayName(species.data?.habitat?.name || 'Unknown'))}</dd></div></dl>
      <div className="abilities"><h2>{t("Abilities")}</h2><div>{item.abilities.map(({ ability, is_hidden }) => <span key={ability.name}>{resource("ability", ability.name)}{is_hidden && <small>{t("Hidden")}</small>}</span>)}</div></div>
      <div className="base-stats"><div className="stats-title"><h2>{t("Base stats")}</h2><span>{t("Total")} <strong>{item.stats.reduce((total, stat) => total + stat.base_stat, 0)}</strong></span></div>{item.stats.map(({ stat, base_stat }) => <div className="stat-row" key={stat.name}><label htmlFor={`stat-${stat.name}`}>{t(STAT_LABELS[stat.name as keyof typeof STAT_LABELS] || displayName(stat.name))}</label><span>{base_stat}</span><meter id={`stat-${stat.name}`} min={0} max={255} value={base_stat}>{base_stat} / 255</meter></div>)}</div>
      </div></div>
      {species.data?.evolution_chain?.url && <EvolutionFamily url={species.data.evolution_chain.url} currentSpecies={item.species.url} backTo={backTo} />}
      {species.data && !species.data.evolution_chain && <p className="evolution-note">{t("No evolution family is recorded for this Pokémon.")}</p>}
      <div className="detail-navigation">{adjacent.previous !== undefined ? <Link to={`/pokemon/${adjacent.previous}`} state={navigation}><ArrowLeft size={19} /><span><small>{t("PREVIOUS POKÉMON")}</small>{name(adjacent.previous, catalog.data?.find((entry) => entry.id === adjacent.previous)?.name || numberLabel(adjacent.previous))}</span></Link> : <span />}
      <Link to={backTo} className="back-grid" aria-label={t('Back to collection')}><Grid2X2 size={23} /></Link>
      {adjacent.next !== undefined ? <Link to={`/pokemon/${adjacent.next}`} state={navigation}><span><small>{t("NEXT POKÉMON")}</small>{name(adjacent.next, catalog.data?.find((entry) => entry.id === adjacent.next)?.name || numberLabel(adjacent.next))}</span><ArrowRight size={19} /></Link> : <span />}</div>
      {catalog.error && !navigation?.sequence && <Status error="The collection could not load, so previous and next navigation is temporarily unavailable." retry={catalog.retry} />}
    </>}
  </section>;
}

function About() {
  const { t } = useLocale();
  return <section className="about-page"><span className="eyebrow">{t("A NOTE FROM THE FIELD")}</span><h1>{t("Made for the curious.")}</h1><p>{t("This is your little window into the world of Pokémon. Discover familiar favorites, explore different types, and take a closer look at the details that make each Pokémon unique.")}</p><div className="about-grid"><article><Search /><h2>{t("Find your favorite")}</h2><p>{t("Search by localized name, English name, or Pokédex number as you type. Sort by name, number, or base stats in either direction.")}</p></article><article><SlidersHorizontal /><h2>{t("Follow your curiosity")}</h2><p>{t("Select one or more types to see Pokémon matching any of them. Switch between the visual gallery and a compact list.")}</p></article><article><BookOpen /><h2>{t("Look a little closer")}</h2><p>{t("Open any Pokémon to see its measurements, abilities, and base stats. Previous and next follow your filtered collection, looping at either end.")}</p></article></div><p className="source-note">{t("Pokémon information and artwork are provided by")} <a href="https://pokeapi.co/docs/v2" target="_blank" rel="noreferrer">{t("PokéAPI ↗")}</a>{t(". Pokémon and Pokémon character names are trademarks of Nintendo. This is an unofficial educational project.")}</p><Link to="/" className="button">{t("Let’s explore")} <ArrowRight size={18} /></Link></section>;
}

function NotFound() { const { t } = useLocale(); return <section className="empty-state"><Compass size={38} /><h1>{t("A little off the beaten path.")}</h1><p>{t("This page isn’t in our field guide.")}</p><Link to="/" className="button">{t("Back to the Pokédex")} <ArrowRight size={17} /></Link></section>; }

export default function App() {
  const { t, namesLoading, namesError, retryNames } = useLocale();
  const catalog = useRemote('catalog', getIndex);
  return <CatalogContext.Provider value={catalog}><a href="#main" className="skip-link">{t("Skip to content")}</a><Header /><main id="main">{namesLoading && <p className="language-notice" role="status">{t("Loading translated names…")}</p>}{namesError && <div className="language-notice" role="alert">{t("Translated names could not load. English names are shown until you retry.")} <button className="text-button" onClick={retryNames}>{t("Try again")}</button></div>}<Routes><Route path="/" element={<Browse />} /><Route path="/list" element={<Browse />} /><Route path="/pokemon/:id" element={<Detail />} /><Route path="/about" element={<About />} /><Route path="*" element={<NotFound />} /></Routes></main><footer className="site-footer"><Link to="/" className="footer-brand"><span className="mini-ball" />{t("A little curiosity. A world of Pokémon.")}</Link><span>{t("Made for explorers. Powered by")} <a href="https://pokeapi.co/" target="_blank" rel="noreferrer">{t("PokéAPI ↗")}</a></span></footer></CatalogContext.Provider>;
}
