const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

test('homepage visual elements and images load successfully', async ({ page }) => {
  // Navigate to the local dev server
  await page.goto('/');

  // Wait for images to load and transitions to complete
  await page.waitForTimeout(3000);

  // Take screenshot of Hero Section
  console.log('Taking hero screenshot...');
  const heroScreenshotPath = '/home/jules/verification/verification_hero.png';
  // Ensure the directory exists
  const dir = path.dirname(heroScreenshotPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  await page.screenshot({ path: heroScreenshotPath });

  // Scroll to Galerie Section
  console.log('Scrolling to #galerie...');
  const galerieElement = page.locator('#galerie');
  await galerieElement.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1000);

  // Take screenshot of Galerie
  console.log('Taking gallery screenshot...');
  const galerieScreenshotPath = '/home/jules/verification/verification_galerie.png';
  await page.screenshot({ path: galerieScreenshotPath });

  // Confirm no Unsplash images are present
  const images = await page.locator('img').all();
  for (const img of images) {
    const src = await img.getAttribute('src');
    const alt = await img.getAttribute('alt');
    if (src) {
      console.log(`Checking image: src=${src}, alt=${alt}`);
      expect(src.includes('unsplash.com')).toBe(false);
      // Ensure local images loaded successfully by verifying naturalWidth > 0
      const naturalWidth = await img.evaluate((el) => el.naturalWidth);
      const fallbackApplied = await img.getAttribute('data-fallback-applied');
      console.log(`Image info - naturalWidth: ${naturalWidth}, fallbackApplied: ${fallbackApplied}`);
      expect(fallbackApplied).toBeNull();
      expect(naturalWidth).toBeGreaterThan(0);
    }
  }

  console.log('Visual test completed successfully!');
});
