import { ArrowRight, GitBranch, LoaderCircle } from 'lucide-react';
import { Link, useLocale } from '../i18n';
import { numberLabel } from '../api';
import { evolutionConditions, evolutionSummary, getEvolutionFamily, getEvolutionResourceNames, evolutionResourceName, type EvolutionNode, type EvolutionText } from '../evolution';
import { useRemote } from '../hooks';
import { PokemonImage } from './PokemonCard';

function Conditions({ path, text }: { path: EvolutionNode[]; text: EvolutionText }) {
  const { t, speciesName } = useLocale();
  return <details className="evolution-conditions"><summary>{t("Evolution conditions")}</summary>
    {path.slice(1).map((node, index) => <div key={node.species.url}>
      <h4>{speciesName(path[index].species.name)} → {speciesName(node.species.name)}</h4>
      {node.evolution_details.length ? <ul>{[...new Set(node.evolution_details.map((detail) => evolutionConditions(detail, text)))].map((condition) => <li key={condition}>{condition}</li>)}</ul> : <p>{t("Conditions are not specified for this relationship.")}</p>}
      {node.evolution_details.length > 1 && <p>{t("Each entry is an alternative method; requirements within an entry apply together.")}</p>}
    </div>)}
  </details>;
}

export default function EvolutionFamily({ url, currentSpecies, backTo }: {
  url: string; currentSpecies: string; backTo: string;
}) {
  const { t, language, speciesName } = useLocale();
  const family = useRemote(`evolution:${url}`, () => getEvolutionFamily(url));
  const data = family.data;
  const labels = useRemote(`evolution-labels:${language !== 'en' && data ? url : ''}`, () => language !== 'en' && data ? getEvolutionResourceNames(data.paths) : Promise.resolve(new Map()));
  const text: EvolutionText = { t, name: (resource) => evolutionResourceName(labels.data, language, resource) };
  const noEvolution = data?.paths.length === 1 && data.paths[0].length === 1;
  return <section className="evolution-section" aria-labelledby="evolution-heading">
    <div className="evolution-heading"><div><span className="eyebrow">{t("CONNECTED BY EVOLUTION")}</span><h2 id="evolution-heading"><GitBranch size={22} />{t("Evolution family")}</h2></div>{family.data && <span className="evolution-count">{t("{count} related species", { count: family.data.pokemon.size })}</span>}</div>
    {family.loading ? <div className="evolution-status" role="status"><LoaderCircle className="spinner" size={20} />{t("Discovering this evolution family…")}</div>
      : family.error ? <div className="evolution-status" role="alert"><p>{t(family.error)}</p><button className="text-button" onClick={family.retry}>{t("Retry evolution family")}</button></div>
      : data && <>
        <p className="evolution-note">{t(noEvolution ? 'This Pokémon has no evolutions in its recorded family.' : 'Follow each branch and select a Pokémon to explore its details.')} {t("Species are shown in their default forms; conditions can vary by game and form.")}</p>
        {labels.error && language !== "en" && <p className="translation-fallback">{t("Translation unavailable; showing English.")} <button className="text-button" onClick={labels.retry}>{t("Try again")}</button></p>}
        <div className="evolution-paths">{data.paths.map((path) => <article key={path.map((node) => node.species.name).join('/')} className={`evolution-path ${path.length > 2 || data.paths.length === 1 ? 'wide-path' : ''}`}>
          <ol className="evolution-stages">{path.map((node, index) => {
            const pokemon = data.pokemon.get(node.species.url)!;
            const current = node.species.url === currentSpecies;
            return <li key={node.species.url}>
              {index > 0 && <div className="evolution-connector"><ArrowRight size={23} /><span>{evolutionSummary(node.evolution_details[0], text)}</span>{node.evolution_details.length > 1 && <small>{t("Multiple methods")}</small>}</div>}
              <Link className={`evolution-pokemon palette-${pokemon.types[0]?.type.name} ${current ? 'current-species' : ''}`} to={`/pokemon/${pokemon.id}`} state={{ backTo }} aria-label={t('View {name} in evolution family', { name: speciesName(node.species.name) })}>
                <div className="evolution-art"><PokemonImage pokemon={pokemon} /></div><span className="pokemon-number">{numberLabel(pokemon.id)}</span><h3>{speciesName(node.species.name)}</h3><span className="evolution-position">{current ? t('Current species') : index === 0 ? t('Base species') : t('Evolution {stage}', { stage: index })}</span>
              </Link>
            </li>;
          })}</ol>
          {path.length > 1 && <Conditions path={path} text={text} />}
        </article>)}</div>
      </>}
  </section>;
}
