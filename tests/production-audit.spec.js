const { test, expect } = require('@playwright/test');

const REQUIRED_FILES = [
  '/.nojekyll',
  '/404.html',
  '/robots.txt',
  '/sitemap.xml',
  '/llms.txt',
  '/site.webmanifest',
  '/assets/img/favicon-16.png',
  '/assets/img/favicon-32.png',
  '/assets/img/apple-touch-icon.png',
  '/assets/img/og-cover.png',
];

test('production artifact has no browser or resource errors', async ({ page }) => {
  const errors = [];
  const warnings = [];
  const pageErrors = [];
  const badResponses = [];

  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
    if (message.type() === 'warning') warnings.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('response', (response) => {
    if (response.status() >= 400) badResponses.push(`${response.status()} ${response.url()}`);
  });

  await page.goto('/', { waitUntil: 'networkidle' });
  await expect(page.locator('h1')).toHaveCount(1);

  const anchors = await page.locator('a[href^="#"]').evaluateAll((items) =>
    items.map((item) => item.getAttribute('href')).filter((href) => href && href !== '#')
  );
  for (const href of anchors) await expect(page.locator(href)).toHaveCount(1);

  const links = await page.locator('a[href]').evaluateAll((items) =>
    items.map((item) => item.getAttribute('href')).filter(Boolean)
  );
  expect(links.some((href) => href.startsWith('TODO_'))).toBe(false);

  const images = await page.locator('img').evaluateAll((items) =>
    items.map((img) => ({ src: img.getAttribute('src'), alt: img.getAttribute('alt') }))
  );
  for (const image of images) {
    expect(image.src, 'image src').toBeTruthy();
    expect(image.alt, `missing alt for ${image.src}`).toBeTruthy();
  }

  await expect(page.locator('[onload], [onerror], [onclick], [onchange], [onsubmit]')).toHaveCount(0);
  await expect(page.locator('title')).toHaveCount(1);
  await expect(page.locator('meta[name="description"]')).toHaveCount(1);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://sudomarc.github.io/CrazyCook/');
  await expect(page.locator('meta[property="og:title"]')).toHaveCount(1);
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', 'https://sudomarc.github.io/CrazyCook/assets/img/og-cover.png');
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image');
  await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(1);

  const schema = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent());
  expect(schema['@type']).toBe('Restaurant');
  expect(schema.url).toBe('https://sudomarc.github.io/CrazyCook/');
  expect(schema.name).toBe('CrazyCook');

  expect(errors).toEqual([]);
  expect(warnings).toEqual([]);
  expect(pageErrors).toEqual([]);
  expect(badResponses).toEqual([]);
});

test('production support files are reachable', async ({ request }) => {
  for (const pathname of REQUIRED_FILES) {
    const response = await request.get(pathname);
    expect(response.status(), pathname).toBe(200);
  }
});
