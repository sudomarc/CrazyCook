# CrazyCook

Template de site restaurant statique, construit en HTML/CSS/JavaScript et déployé sur GitHub Pages.

## Développement local

```bash
npm ci
npm run build
npm test
```

Le build génère le site de production dans `dist/`.

## Déploiement

Le seul pipeline de production est `.github/workflows/static.yml` :

1. installation reproductible avec `npm ci` ;
2. génération de `dist/` ;
3. génération des assets PNG requis ;
4. minification ;
5. audit Playwright de l'artefact final ;
6. publication via GitHub Pages.

Le dépôt ne doit pas utiliser un second workflow de publication ou un second gestionnaire de dépendances pour ce site.
