import { copyFileSync } from 'node:fs';

// GitHub Pages serves this application shell when a detail URL is opened directly.
// BrowserRouter then reads the original URL. No inline redirect script is needed.
copyFileSync('dist/index.html', 'dist/404.html');
