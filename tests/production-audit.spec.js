const { test, expect } = require('@playwright/test');

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

  const images = await page.locator('img').evaluateAll((items) =>
    items.map((img) => ({ src: img.getAttribute('src'), alt: img.getAttribute('alt') }))
  );
  for (const image of images) {
    expect(image.src, 'image src').toBeTruthy();
    expect(image.alt, `missing alt for ${image.src}`).toBeTruthy();
  }

  await expect(page.locator('title')).toHaveCount(1);
  await expect(page.locator('meta[name="description"]')).toHaveCount(1);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://sudomarc.github.io/CrazyCook/');
  await expect(page.locator('meta[property="og:title"]')).toHaveCount(1);
  await expect(page.locator('meta[property="og:image"]')).toHaveCount(1);
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image');
  await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(1);

  expect(errors).toEqual([]);
  expect(warnings).toEqual([]);
  expect(pageErrors).toEqual([]);
  expect(badResponses).toEqual([]);
});

test('production support files are reachable', async ({ request }) => {
  for (const pathname of ['/404.html', '/robots.txt', '/sitemap.xml', '/llms.txt', '/site.webmanifest']) {
    const response = await request.get(pathname);
    expect(response.status(), pathname).toBe(200);
  }
});
