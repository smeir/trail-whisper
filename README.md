# Trail Whisper

Dies ist eine minimalistische Hello-World-React-Anwendung, erstellt mit [Vite](https://vite.dev/).
Die App ist als reine Client-Anwendung umgesetzt und wird über GitHub Pages bereitgestellt.

## Entwicklung starten

```bash
npm install
npm run dev
```

Danach ist die Anwendung unter http://localhost:5173 verfügbar.

## Produktion bauen

```bash
npm run build
```

Der produzierte Build landet im Ordner `dist/` und wird von der GitHub-Pages-Integration verwendet.

## Deployment auf GitHub Pages

Der Workflow unter `.github/workflows/deploy.yml` baut die Anwendung und veröffentlicht sie automatisch
auf GitHub Pages, sobald Änderungen auf den `main`-Branch gepusht werden. Manuelles Auslösen über
"Run workflow" ist ebenfalls möglich.

Stelle sicher, dass GitHub Pages in den Repository-Einstellungen auf die Quelle "GitHub Actions" gesetzt ist.
