const { test, expect } = require('@playwright/test');

test('homepage images load without external placeholders', async ({ page }) => {
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.locator('#galerie').scrollIntoViewIfNeeded();

  const images = await page.locator('img').evaluateAll((items) =>
    items.map((img) => ({ src: img.currentSrc || img.src, alt: img.alt, width: img.naturalWidth }))
  );

  for (const image of images) {
    expect(image.src).not.toContain('unsplash.com');
    expect(image.alt).toBeTruthy();
    expect(image.width).toBeGreaterThan(0);
  }
});

test('end-to-end order placement flow', async ({ page }) => {
  await page.goto('/', { waitUntil: 'networkidle' });

  const addToCartButton = page.locator('.add-to-cart').first();
  await expect(addToCartButton).toBeVisible();
  await addToCartButton.click();
  await expect(page.locator('#header-cart-count')).toHaveText('1');

  await page.locator('#header-cart-toggle').click();
  await page.locator('#cart-validate').click();

  await page.locator('input[name="name"]').fill('Demo User');
  await page.locator('input[name="phone"]').fill('000000000');
  await page.locator('input[name="address"]').fill('TODO_ADRESSE_ICI');
  await page.locator('#cart-validate').click();

  await page.locator('[data-payment="orange_money"]').click();
  await page.locator('input[name="omPhone"]').fill('000000000');
  await page.locator('#cart-validate').click();

  await expect(page.locator('.cart-confirmation h4')).toContainText('Paiement confirmé', { timeout: 5000 });
});

test('delivery form fields are preserved in real time when stepping back and forth', async ({ page }) => {
  await page.goto('/', { waitUntil: 'networkidle' });

  const addToCartButton = page.locator('.add-to-cart').first();
  await addToCartButton.click();

  await page.locator('#header-cart-toggle').click();
  await page.locator('#cart-validate').click();

  await page.locator('input[name="name"]').fill('Mamadou Diallo');
  await page.locator('input[name="phone"]').fill('+224 628 00 00 00');
  await page.locator('input[name="address"]').fill('Kaloum, Conakry');

  // Step back to cart without submitting the form
  await page.locator('#back-to-cart').click();
  await expect(page.locator('.cart-items')).toBeVisible();

  // Return to delivery step
  await page.locator('#cart-validate').click();

  // Verify typed inputs are preserved
  await expect(page.locator('input[name="name"]')).toHaveValue('Mamadou Diallo');
  await expect(page.locator('input[name="phone"]')).toHaveValue('+224 628 00 00 00');
  await expect(page.locator('input[name="address"]')).toHaveValue('Kaloum, Conakry');
});

test('FAQ accordion triggers support WAI-ARIA keyboard navigation', async ({ page }) => {
  await page.goto('/', { waitUntil: 'networkidle' });

  const firstTrigger = page.locator('.faq-trigger').first();
  await firstTrigger.focus();
  await expect(firstTrigger).toBeFocused();

  // Press ArrowDown to move focus to second trigger
  await page.keyboard.press('ArrowDown');
  const secondTrigger = page.locator('.faq-trigger').nth(1);
  await expect(secondTrigger).toBeFocused();

  // Press End to move focus to last trigger
  await page.keyboard.press('End');
  const lastTrigger = page.locator('.faq-trigger').last();
  await expect(lastTrigger).toBeFocused();

  // Press ArrowUp to move focus to third trigger
  await page.keyboard.press('ArrowUp');
  const thirdTrigger = page.locator('.faq-trigger').nth(2);
  await expect(thirdTrigger).toBeFocused();

  // Press Home to move focus back to first trigger
  await page.keyboard.press('Home');
  await expect(firstTrigger).toBeFocused();
});
