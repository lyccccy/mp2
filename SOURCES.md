# Sources and acknowledgements

- PokéAPI REST v2 documentation: https://pokeapi.co/docs/v2/ — resource lists, Pokémon, species, type, and evolution-chain endpoints, including evolution conditions and default varieties. All Pokémon records are requested at runtime using Axios. Image URLs come from API responses, and images load from the remote sprite host.
- PokéAPI GraphQL documentation: https://pokeapi.co/docs/graphql — official v1beta2 endpoint, queried at runtime via Axios for a compact base-stat index used for global numeric sorting, plus official species/type/ability translations. REST `names`, `genera`, and `flavor_text_entries` language fields supply localized details and evolution resource names.
- React Router documentation: https://reactrouter.com/start/declarative/routing — declarative routes, links, and route parameters.
- Axios documentation: https://axios-http.com/docs/intro — HTTP client usage.
- Vite documentation: https://vite.dev/guide/ — React + TypeScript build tooling and base path configuration.
- Lucide React package: https://lucide.dev/ — interface icons (ISC license).
- Google Fonts: https://fonts.google.com/specimen/DM+Sans and https://fonts.google.com/specimen/Manrope — typography (SIL Open Font License).

Pokémon and Pokémon character names are trademarks of Nintendo. This is an unofficial educational project; artwork is provided through PokéAPI's sprite repository.

Implementation assistance: OpenAI Codex generated and reviewed code in conversation with the repository owner. Per the assignment's LLM policy, submit the complete conversation log with the source code and answer the LLM survey in the grading form. This acknowledgement is not a substitute for that log.
