import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { Link as RouterLink, NavLink as RouterNavLink, useLocation, useNavigate, type LinkProps, type NavLinkProps } from 'react-router-dom';
import { displayName } from './api';
import { useRemote } from './hooks';
import { getNameIndex, languageLocale, localizedPokemonName, parseLanguage, selectLanguage, withLanguage, type Language, type NameIndex } from './localization';
import { translate } from './translations';

function useLocaleState() {
  const location = useLocation();
  const navigate = useNavigate();
  const language = parseLanguage(new URLSearchParams(location.search).get('lang'));
  const remote = useRemote('names:' + (language !== 'en'), () => language === 'en' ? Promise.resolve<NameIndex | undefined>(undefined) : getNameIndex());
  const t = (text: string, values?: Record<string, string | number>) => translate(language, text, values);
  const name = (id: number, fallback: string) => localizedPokemonName(remote.data, language, id, fallback);
  const resource = (kind: string, slug: string) => selectLanguage(remote.data?.resources.get(`${kind}/${slug}`) || [], language)?.name || displayName(slug);
  const speciesName = (slug: string) => selectLanguage(remote.data?.species.get(slug) || [], language)?.name || displayName(slug);
  return {
    language, locale: languageLocale(language), t, name, resource, speciesName,
    namesLoading: language !== 'en' && remote.loading,
    namesError: language !== 'en' ? remote.error : undefined, retryNames: remote.retry,
    setLanguage: (next: Language) => navigate(withLanguage(location.pathname + location.search + location.hash, next), { replace: true, state: location.state }),
    href: (to: string) => withLanguage(to, language),
  };
}
const LocaleContext = createContext<ReturnType<typeof useLocaleState> | null>(null);
export function LocaleProvider({ children }: { children: ReactNode }) {
  const locale = useLocaleState();
  useEffect(() => {
    document.documentElement.lang = locale.locale;
    document.title = locale.t('Pokédex — The Pokémon Field Guide');
  }, [locale.language]);
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}
export const useLocale = () => useContext(LocaleContext)!;
export function Link({ to, ...props }: Omit<LinkProps, 'to'> & { to: string }) {
  const { href } = useLocale();
  return <RouterLink {...props} to={href(to)} />;
}
export function NavLink({ to, ...props }: Omit<NavLinkProps, 'to'> & { to: string }) {
  const { href } = useLocale();
  return <RouterNavLink {...props} to={href(to)} />;
}
