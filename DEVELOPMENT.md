# Pokémon Field Guide

The original assignment README and GitHub Pages workflow are preserved.

## Run

```sh
npm ci
npm run dev
```

Open http://localhost:5173/mp2/.

```sh
npm test
npm run build
npm run preview
```

## Assignment features

- `/mp2/list`: list view with immediate name/number search and ascending/descending sorting by ID, name, HP, Attack, Defense, Sp. Attack, Sp. Defense, Speed, or the sum of the six base stats. Stat values appear on cards/rows when selected. Sorting applies to every matching result before pagination; equal values use ascending ID as a stable tie-break.
- `/mp2/`: image gallery with the same search/sort tools and multiple type filters. Multiple selected types use OR (any selected type).
- `/mp2/pokemon/25`: directly addressable detail page. Both views link here. Details include remote artwork, description, types, dimensions, abilities, and six base stats. Previous/next follow the entire filtered and sorted result sequence, wrap at either end, and return to the original query/page/view. A single result has no other item to navigate to; a direct URL uses the full catalog.
- React, TypeScript, React Router, Axios, Vite; stylesheet-based styling without inline styles or inline script bodies. No tables used for layout.
- Loading, empty, request-error/retry, missing artwork, invalid route, keyboard focus, and narrow-screen layouts.
- Detail pages also display the species' evolution family, with separate root-to-leaf branches, linked artwork, the current species highlighted, and expandable evolution requirements. Single-species families explicitly indicate no recorded evolutions. Relationships and requirements come directly from the species/evolution-chain API; default Pokémon varieties are resolved through species responses, including species whose names differ from their Pokémon varieties. Evolution links preserve the collection return URL and use the full catalog for previous/next navigation. Families are species-level relationships, not a guarantee that every form can follow every listed method.

## Visual design

The visual design takes its cues from a handheld Pokédex: a red case with a blue scanning lens, yellow controls, LCD-style artwork panels, Poké Ball motifs, and type-colored icons and cards. The gallery, list, detail, and evolution views share the same outlined controls and responsive layout. Decorative hardware and backgrounds are drawn in CSS; Pokémon artwork still comes from live API responses. Keyboard focus and reduced-motion preferences are supported.

## Runtime API data

`src/api.ts` is the API boundary. Axios calls `https://pokeapi.co/api/v2/` directly from the browser. The name/ID index is fetched once per page session; type membership is requested on selection; full Pokémon records are requested only for the visible page (18 at a time, at most six in parallel), featured Pokémon, or detail view and its evolution family. Species field notes and the evolution chain are fetched when a detail page opens. Evolution family members are resolved through each species' default variety, with at most six concurrent member-loading tasks. Images use URLs from those API responses.

Successful requests are deduplicated in a JavaScript `Map` for the current page session to avoid repeated requests. There is no persisted Pokémon dataset, local data fallback, localStorage, IndexedDB, service worker, or build-time API download. Reloading the app initiates API requests again (the browser may apply normal HTTP caching). The app needs an internet connection; errors display a retry action instead of substituting mock data.

On the first numeric sort, Axios sends a runtime POST to PokéAPI's official `https://graphql.pokeapi.co/v1beta2` endpoint requesting only IDs and the six base stats for the catalog. That small stat index is reused in memory across stats, sort directions, search queries, and type filters. Any matching Pokémon absent or incomplete in GraphQL is resolved using REST before results are sorted. A failed request shows a retry action rather than an incomplete ranking. Name/ID sorting works independently of this endpoint. No stats are downloaded at build time or persisted locally.

Search/sort/type/page state is in the collection URL. Detail navigation state preserves the complete matching sequence. The API catalog includes alternate forms, whose API IDs may exceed the National Pokédex range.

## Languages

The header switches between English, Simplified Chinese, Traditional Chinese, and Japanese. `lang=zh-hans`, `lang=zh-hant`, or `lang=ja` is preserved in internal links and on refresh; switching language preserves the current route, filters, sort, page, and detail navigation state. Resetting filters preserves the language. No browser storage is used.

UI copy lives in `src/translations.ts`. Official Pokémon species names, types, and abilities come from a runtime PokéAPI GraphQL name index. Species descriptions and genera are selected from the live REST language fields. Japanese falls back to `ja-hrkt`, then English; other languages fall back to English. Missing descriptions explicitly show the fallback message. Alternate forms keep their English API form name alongside the translated species name to distinguish them. Evolution condition resources load their official names from REST on demand. Untranslated API resources retain their English names.

Search matches the displayed localized name as well as English name/number, and name sorting uses the selected locale. Loading translated names blocks partial name rankings; a failed translation request shows a retry action and English names. This adds no local Pokémon translation dataset; only UI messages are bundled.

## GitHub Pages deployment

Vite's base is `/mp2/`; BrowserRouter uses `import.meta.env.BASE_URL`. The build copies the app shell to `dist/404.html`, so GitHub Pages can render direct detail links and refreshed nested routes without inline redirect scripts. GitHub Pages returns HTTP 404 for the fallback, while the application correctly renders the requested detail route. For a different repository name, update `base` in `vite.config.ts`.

The existing Actions workflow installs with `npm ci` and builds `dist/`. To publish, use the assignment instructions to set Pages source to GitHub Actions and push to `main`. Local implementation does not itself publish the site.

## Before submission

Include `package-lock.json`, sources listed in `SOURCES.md`, and the complete LLM conversation log required by README. Deploy, record the required demo (at most three minutes), and complete the course submission form separately.
