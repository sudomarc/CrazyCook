import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const configPath = path.join(root, 'site.config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

if (!config.url || !/^https?:\/\/[^\s]+$/.test(config.url)) {
  throw new Error(`Invalid site.config.json url: ${config.url}`);
}

if (!config.name || typeof config.name !== 'string') {
  throw new Error('site.config.json must define a non-empty name');
}

if (!Array.isArray(config.openingHours) || config.openingHours.length === 0) {
  throw new Error('site.config.json must define at least one openingHours entry');
}

const baseUrl = config.url.replace(/\/$/, '');
const isTodo = (value) => typeof value !== 'string' || value.startsWith('TODO_');

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });

const copy = (source, destination = source) => {
  const from = path.join(root, source);
  const to = path.join(dist, destination);
  if (!fs.existsSync(from)) {
    throw new Error(`Required build input is missing: ${source}`);
  }
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.cpSync(from, to, { recursive: true });
};

copy('assets');

let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

const seo = `
    <meta name="description" content="${config.name} — ${config.description}">
    <meta name="robots" content="index,follow">
    <link rel="canonical" href="${baseUrl}/">
    <meta property="og:type" content="website">
    <meta property="og:locale" content="fr_FR">
    <meta property="og:site_name" content="${config.name}">
    <meta property="og:title" content="${config.name} | Restaurant template">
    <meta property="og:description" content="${config.description}">
    <meta property="og:url" content="${baseUrl}/">
    <meta property="og:image" content="${baseUrl}/assets/img/og-cover.png">
    <meta property="og:image:alt" content="${config.name} — aperçu du template restaurant">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${config.name} | Restaurant template">
    <meta name="twitter:description" content="${config.description}">
    <meta name="twitter:image" content="${baseUrl}/assets/img/og-cover.png">
    <meta name="twitter:image:alt" content="${config.name} — aperçu du template restaurant">
    <link rel="manifest" href="${baseUrl}/site.webmanifest">
    <link rel="icon" href="${baseUrl}/assets/img/favicon.svg" type="image/svg+xml">
    <link rel="icon" href="${baseUrl}/assets/img/favicon-16.png" type="image/png" sizes="16x16">
    <link rel="icon" href="${baseUrl}/assets/img/favicon-32.png" type="image/png" sizes="32x32">
    <link rel="apple-touch-icon" href="${baseUrl}/assets/img/apple-touch-icon.png" sizes="180x180">
`;

html = html.replace(/\s*<meta name="description"[^>]*>/, '');
html = html.replace(/\s*<link rel="icon"[^>]*>/, '');
html = html.replace(/(<title>.*?<\/title>)/, `$1\n${seo.trimEnd()}`);
html = html.replace(/\n\s*<script>\s*\/\/ Définition immédiate des handlers[\s\S]*?<\/script>\s*/m, '\n    <script src="assets/js/image-fallback.js" defer></script>\n');
html = html.replaceAll(' onload="imageLoaded(this)"', '');
html = html.replaceAll(' onerror="imageFailed(this)"', '');
html = html.replaceAll(' onsubmit="return false;"', '');

const removeOrConfigureSocialLink = (label, value) => {
  const pattern = new RegExp(`\\s*<a href="#" aria-label="${label}">[\\s\\S]*?<\\/a>`, 'm');
  if (isTodo(value)) {
    html = html.replace(pattern, '');
    return;
  }
  html = html.replace(pattern, (match) => match.replace('href="#"', `href="${value}"`));
};

removeOrConfigureSocialLink('Instagram', config.instagram);
removeOrConfigureSocialLink('Facebook', config.facebook);
removeOrConfigureSocialLink('TikTok', config.tiktok);

const replacements = new Map([
  ['12 Avenue de l\'Indépendance, Conakry', isTodo(config.address) ? 'Adresse sur demande' : config.address],
  ['+224 628 069 479', isTodo(config.telephone) ? 'Téléphone sur demande' : config.telephone],
  ['Lun–Dim · 11h–22h', isTodo(config.openingHours[0]) ? 'Horaires sur demande' : config.openingHours[0]],
  ['4.8 ★ · 210 avis', ''],
  ['Commandé 34 fois aujourd\'hui', ''],
  ['Commandé 58 fois aujourd\'hui', ''],
  ['Commandé 27 fois aujourd\'hui', ''],
  ['Nous livrons actuellement dans toute la presqu\'île de Kaloum ainsi que dans les quartiers de Dixinn, Bellevue et Madina à Conakry. Les frais de livraison sont fixes et s\'élèvent à 2 000 GNF par commande.', 'Contactez-nous pour connaître les modalités de livraison.'],
  ['Notre restaurant et notre service de livraison sont ouverts tous les jours, du lundi au dimanche, de 11h00 à 22h00 sans interruption.', isTodo(config.openingHours[0]) ? 'Consultez-nous pour connaître les horaires.' : config.openingHours[0]],
  ['CrazyCook est né à Conakry de l’envie de célébrer la richesse des rituels culinaires d’Afrique de l\'Ouest, sous un jour brut et contemporain.', 'CrazyCook est un exemple de template pensé pour célébrer une cuisine généreuse sous un jour brut et contemporain.'],
  ['<span class="stat-value">Depuis 2024</span>', '<span class="stat-value">Template</span>'],
  ['<span class="stat-label">Conakry</span>', '<span class="stat-label">Démonstration</span>'],
  ['Enfin un lieu à Conakry qui allie modernité esthétique et respect absolu des rituels de cuisson.', 'Enfin un lieu qui allie modernité esthétique et respect absolu des rituels de cuisson.'],
]);
for (const [from, to] of replacements) html = html.replaceAll(from, to);

// Remove empty placeholder-only UI generated from optional template data.
html = html.replace(/\s*<span class="order-pill">\s*<\/span>/g, '');
html = html.replace(/<div class="rating-badge"[^>]*>\s*<\/div>/g, '');

const restaurantJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Restaurant',
  name: config.name,
  url: `${baseUrl}/`,
  description: isTodo(config.description) ? undefined : config.description,
  image: [`${baseUrl}/assets/img/og-cover.png`],
  telephone: isTodo(config.telephone) ? undefined : config.telephone,
  priceRange: isTodo(config.priceRange) ? undefined : config.priceRange,
  address: {
    '@type': 'PostalAddress',
    streetAddress: isTodo(config.address) ? undefined : config.address,
    addressLocality: isTodo(config.city) ? undefined : config.city,
    postalCode: isTodo(config.postalCode) ? undefined : config.postalCode,
    addressCountry: isTodo(config.country) ? undefined : config.country,
  },
  openingHours: config.openingHours.filter((value) => !isTodo(value)),
  sameAs: [config.instagram, config.facebook, config.tiktok].filter((value) => !isTodo(value)),
};

const compact = (value) => JSON.parse(JSON.stringify(value));
html = html.replace('</head>', `    <script type="application/ld+json">${JSON.stringify(compact(restaurantJsonLd))}</script>\n</head>`);

if (/TODO_[A-Z0-9_]+/.test(html)) {
  throw new Error('Production HTML still contains a TODO placeholder');
}

fs.writeFileSync(path.join(dist, 'index.html'), html);
for (const file of ['404.html', 'robots.txt', 'sitemap.xml', 'llms.txt', 'site.webmanifest']) {
  copy(file);
}

const ogSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><rect width="1200" height="630" fill="#1f1a17"/><text x="80" y="280" fill="#f5f0e8" font-family="Georgia,serif" font-size="92" font-weight="700">CrazyCook</text><text x="82" y="355" fill="#c8832a" font-family="Arial,sans-serif" font-size="30">Restaurant Template</text></svg>`;
fs.writeFileSync(path.join(dist, 'assets/img/og-cover.svg'), ogSvg);

// Support files for favicon/meta images in build artifact
for (const imgName of ['favicon-16.png', 'favicon-32.png', 'apple-touch-icon.png', 'og-cover.png']) {
  const targetPath = path.join(dist, 'assets/img', imgName);
  if (!fs.existsSync(targetPath)) {
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.writeFileSync(targetPath, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64'));
  }
}

// Tell static hosting layers not to treat this artifact as a Jekyll source tree.
fs.writeFileSync(path.join(dist, '.nojekyll'), '');

console.log(`Built ${dist} for ${baseUrl}`);
