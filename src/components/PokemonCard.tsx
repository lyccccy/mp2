import { ArrowUpRight, Bug, Circle, Droplets, Eye, Feather, Flame, FlaskConical, Gem, Ghost, Leaf, Moon, Mountain, Orbit, Shield, Snowflake, Sparkles, Star, Swords, Zap } from 'lucide-react';
import { Link, useLocale } from '../i18n';
import { useState } from 'react';
import { artwork, numberLabel, type Pokemon } from '../api';
import { STAT_LABELS, type StatSort } from '../stats';

export function PokemonImage({ pokemon, shiny = false }: { pokemon: Pokemon; shiny?: boolean }) {
  const { name, t } = useLocale();
  const url = artwork(pokemon, shiny);
  const [failed, setFailed] = useState<string | null>(null);
  return url && failed !== url
    ? <img src={url} alt={name(pokemon.id, pokemon.name)} loading="lazy" onError={() => setFailed(url)} />
    : <span className="image-fallback" role="img" aria-label={t("{name}: image unavailable", { name: name(pokemon.id, pokemon.name) })}>?</span>;
}

export function TypeBadge({ name }: { name: string }) {
  const { resource } = useLocale();
  return <span className={`type-badge type-${name}`}><TypeIcon name={name} />{resource("type", name)}</span>;
}

const typeIcons = { normal: Circle, fire: Flame, water: Droplets, grass: Leaf, electric: Zap,
  ice: Snowflake, fighting: Swords, poison: FlaskConical, ground: Mountain, flying: Feather,
  psychic: Eye, bug: Bug, rock: Gem, ghost: Ghost, dragon: Orbit, dark: Moon, steel: Shield,
  fairy: Sparkles, stellar: Star };

export function TypeIcon({ name }: { name: string }) {
  const Icon = typeIcons[name as keyof typeof typeIcons] || Circle;
  return <Icon className="type-icon" size={14} strokeWidth={2.5} aria-hidden="true" />;
}

export default function PokemonCard({ pokemon, sequence, backTo, list, statSort, statValue }: {
  pokemon: Pokemon; sequence: number[]; backTo: string; list: boolean;
  statSort?: StatSort; statValue?: number;
}) {
  const { t, name } = useLocale();
  return <Link to={`/pokemon/${pokemon.id}`} state={{ sequence, backTo }}
    className={`pokemon-card ${list ? 'pokemon-row' : ''} palette-${pokemon.types[0]?.type.name}`}
    aria-label={t("View {name}, {number}", { name: name(pokemon.id, pokemon.name), number: numberLabel(pokemon.id) })}>
    <div className="card-art"><span className="art-orbit" /><PokemonImage pokemon={pokemon} /><span className="card-open"><ArrowUpRight size={17} /></span></div>
    <div className="card-info"><span className="pokemon-number">{numberLabel(pokemon.id)}</span><h3>{name(pokemon.id, pokemon.name)}</h3>{statSort && <span className="card-stat">{t(STAT_LABELS[statSort])} <strong>{statValue ?? '—'}</strong></span>}</div>
    <div className="card-types">{pokemon.types.map(({ type }) => <TypeBadge key={type.name} name={type.name} />)}</div>
    {list && <><span className="row-measure">{pokemon.height / 10} {t("m")}</span><span className="row-measure">{pokemon.weight / 10} {t("kg")}</span><ArrowUpRight className="row-arrow" size={20} /></>}
  </Link>;
}
