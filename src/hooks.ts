import { useEffect, useState } from 'react';

export function useRemote<T>(key: string, loader: () => Promise<T>) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{ key: string; data?: T; error?: string }>({ key: '' });
  useEffect(() => {
    let active = true;
    setState({ key });
    loader().then(
      (data) => { if (active) setState({ key, data }); },
      () => { if (active) setState({ key, error: 'We couldn’t reach PokéAPI. Check your connection and try again.' }); },
    );
    return () => { active = false; };
    // The key explicitly identifies the requested resource and its dependencies.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, attempt]);
  const current = state.key === key ? state : { key };
  return { ...current, loading: current.data === undefined && !current.error, retry: () => setAttempt((value) => value + 1) };
}
