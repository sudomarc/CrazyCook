# AGENTS.md — CrazyCook

## Project purpose and truth
- CrazyCook is a static restaurant-site template/demo, not a real restaurant.
- Do not claim real orders, payments, merchant details, opening hours, customer reviews, or business results.
- Keep the public site attribution to Sudomarc and the demo status explicit.
- Use only grounded project URLs; do not invent canonical domains or social profiles.

## Source and build
- The production source is HTML/CSS/JavaScript with a generated `dist/` artifact.
- Use the single publishing workflow: `.github/workflows/static.yml`.
- Do not add a second Pages deploy workflow or a second dependency manager.
- Use `npm ci`, `npm run build`, and `npm test` to verify production changes.

## SEO
- Keep `site.config.json`, HTML head metadata, JSON-LD, `robots.txt`, and `sitemap.xml` aligned.
- `WebSite` structured data must describe a demo website, not a real `Restaurant` entity.
- Preserve exactly one canonical URL and one JSON-LD block in the final production artifact.
- The sitemap contains only canonical public URLs; template placeholders and previews must not be listed.

## Workflow
- Read this file and the relevant tests before making changes.
- Use a task branch and pull request; do not push directly to `main`.
- Report what was implemented, which checks really ran, and any publication/indexing state that remains unverified.
