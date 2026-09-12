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

test('back-to-top button scrolls page, transfers focus to main content, and announces action', async ({ page }) => {
  await page.goto('/', { waitUntil: 'networkidle' });

  // Scroll down to make back-to-top button visible
  await page.evaluate(() => window.scrollTo(0, 1000));
  const backToTopBtn = page.locator('#back-to-top');
  await expect(backToTopBtn).toBeVisible();

  // Click back to top button
  await backToTopBtn.click();

  // Verify focus was transferred to #main-content
  const mainContent = page.locator('#main-content');
  await expect(mainContent).toBeFocused();

  // Verify screen reader live status announcement
  const liveStatus = page.locator('#cart-live-status');
  await expect(liveStatus).toHaveText('Retour en haut de la page.');
});

test('reorder banner reloads items, opens cart drawer, and announces action', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('crazycook:lastOrder', JSON.stringify({
      items: [{ name: 'Soupe de haricot noir', price: 8000, quantity: 2 }],
      savedAt: Date.now()
    }));
  });
  await page.reload({ waitUntil: 'networkidle' });

  const reorderBanner = page.locator('#reorder-banner');
  await expect(reorderBanner).toBeVisible();

  await page.locator('#reorder-button').click();

  // Verify cart drawer is opened
  const cartDrawer = page.locator('#cart-drawer');
  await expect(cartDrawer).toHaveClass(/is-open/);

  // Verify badge count updated
  await expect(page.locator('#header-cart-count')).toHaveText('2');

  // Verify live status announcement
  const liveStatus = page.locator('#cart-live-status');
  await expect(liveStatus).toHaveText('Dernière commande ajoutée à votre panier.');
});

test('clear cart button clears all items, announces action, and focuses empty cart cta', async ({ page }) => {
  await page.goto('/', { waitUntil: 'networkidle' });

  // Add 2 different items to cart
  const addToCartButtons = page.locator('.add-to-cart');
  await addToCartButtons.nth(0).click();
  await addToCartButtons.nth(1).click();

  // Open cart drawer
  await page.locator('#header-cart-toggle').click();

  // Verify "Vider le panier" button is visible
  const clearCartBtn = page.locator('#clear-cart-btn');
  await expect(clearCartBtn).toBeVisible();

  // Click "Vider le panier" button
  await clearCartBtn.click();

  // Verify cart is now empty
  await expect(page.locator('.empty-state-text')).toBeVisible();

  // Verify empty CTA is visible and focused
  const emptyCta = page.locator('#empty-cart-cta');
  await expect(emptyCta).toBeVisible();
  await expect(emptyCta).toBeFocused();

  // Verify header badge count reset to 0
  await expect(page.locator('#header-cart-count')).toHaveText('0');

  // Verify live status announcement
  const liveStatus = page.locator('#cart-live-status');
  await expect(liveStatus).toHaveText('Le panier a été vidé.');
});

test('completed checkout stepper items are accessible and support click/keyboard step navigation', async ({ page }) => {
  await page.goto('/', { waitUntil: 'networkidle' });

  // Add item and open cart
  await page.locator('.add-to-cart').first().click();
  await page.locator('#header-cart-toggle').click();

  // Advance to step 2 (Livraison)
  await page.locator('#cart-validate').click();
  await expect(page.locator('#delivery-form')).toBeVisible();

  // Verify step 1 (Panier) is completed, interactive, and has proper ARIA attributes
  const step1 = page.locator('.step-item[data-step="cart"]');
  await expect(step1).toHaveClass(/completed/);
  await expect(step1).toHaveAttribute('role', 'button');
  await expect(step1).toHaveAttribute('tabindex', '0');
  await expect(step1).toHaveAttribute('aria-label', "Retourner à l'étape Panier");

  // Click step 1 to navigate back
  await step1.click();
  await expect(page.locator('.cart-items')).toBeVisible();
  await expect(page.locator('#cart-live-status')).toHaveText("Retour à l'étape Panier.");

  // Advance to step 2 again
  await page.locator('#cart-validate').click();
  await expect(page.locator('#delivery-form')).toBeVisible();

  // Navigate back using keyboard (focus + Enter)
  await step1.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.cart-items')).toBeVisible();
});
