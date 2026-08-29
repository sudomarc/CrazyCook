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

test('end-to-end order placement flow', async ({ page }) => {
  // 1. Navigate to homepage
  await page.goto('/');
  await page.waitForTimeout(1000);

  // 2. Select a menu item and add it to the cart
  const addToCartButton = page.locator('.add-to-cart').first();
  await expect(addToCartButton).toBeVisible();
  await addToCartButton.click();

  // 3. Assert the header cart count updates to 1
  const cartBadge = page.locator('#header-cart-count');
  await expect(cartBadge).toHaveText('1');

  // 4. Open the cart drawer
  const cartToggle = page.locator('#header-cart-toggle');
  await cartToggle.click();

  // Verify Checkout Stepper is visible and step 1 "Panier" is active
  const stepper = page.locator('#checkout-stepper');
  await expect(stepper).toBeVisible();
  const stepCart = page.locator('.step-item[data-step="cart"]');
  await expect(stepCart).toHaveClass(/active/);

  // 5. Fill and submit the delivery form
  // Click on "Valider la commande" button to proceed to delivery step
  const validateBtn = page.locator('#cart-validate');
  await expect(validateBtn).toBeVisible();
  await validateBtn.click();

  // Verify Checkout Stepper progresses: step 2 "Livraison" is active
  const stepDelivery = page.locator('.step-item[data-step="delivery"]');
  await expect(stepDelivery).toHaveClass(/active/);
  await expect(stepCart).toHaveClass(/completed/);

  // Fill the delivery form
  // Let's print out the page content if we can't find #delivery-name
  const nameInput = page.locator('input[name="name"]');
  await expect(nameInput).toBeVisible();
  await nameInput.fill('John Doe');

  const phoneInput = page.locator('input[name="phone"]');
  await phoneInput.fill('628069479');

  const addressInput = page.locator('input[name="address"]');
  await addressInput.fill('Almamya, Conakry');

  // Click submit to proceed to payment step
  // Let's click the validate button (which acts as Choisir le paiement)
  await validateBtn.click();
  await page.waitForTimeout(500);

  // Verify Checkout Stepper progresses: step 3 "Paiement" is active
  const stepPayment = page.locator('.step-item[data-step="payment"]');
  await expect(stepPayment).toHaveClass(/active/);
  await expect(stepDelivery).toHaveClass(/completed/);

  // 6. Click on Orange Money payment method and check simulated processing/confirmation
  const omPaymentBtn = page.locator('[data-payment="orange_money"]');
  await expect(omPaymentBtn).toBeVisible();
  await omPaymentBtn.click();

  // Fill out the OM form
  const omPhoneInput = page.locator('input[name="omPhone"]');
  await expect(omPhoneInput).toBeVisible();
  await omPhoneInput.fill('628069479');

  // Click submit to proceed to processing/confirmation step (using validateBtn which is Confirmer le paiement)
  await validateBtn.click();

  // Confirm simulated transition reference
  // There is a 1800ms simulated timeout in the JS script, so let's wait 3000ms
  await page.waitForTimeout(3000);
  const confirmationText = page.locator('.cart-confirmation h4');
  await expect(confirmationText).toContainText('Paiement confirmé');

  console.log('E2E Order flow test completed successfully!');
});

test('cart drawer stepper retains focus when updating item quantities', async ({ page }) => {
  await page.goto('/');

  // Add item to cart
  const addToCartBtn = page.locator('.add-to-cart').first();
  await addToCartBtn.click();

  // Open cart drawer
  const cartToggle = page.locator('#header-cart-toggle');
  await cartToggle.click();

  // Locate the plus (+) button
  const plusBtn = page.locator('.cart-stepper button[data-change="+"]').first();
  await expect(plusBtn).toBeVisible();

  // Click plus button
  await plusBtn.click();

  // Verify focus remains on plus button after re-render
  await expect(plusBtn).toBeFocused();

  // Locate minus (-) button and click
  const minusBtn = page.locator('.cart-stepper button[data-change="-"]').first();
  await minusBtn.click();

  // Verify focus remains on minus button
  await expect(minusBtn).toBeFocused();
});

test('cart drawer step transitions automatically focus logical first elements', async ({ page }) => {
  await page.goto('/');

  // Add item to cart and open drawer
  await page.locator('.add-to-cart').first().click();
  await page.locator('#header-cart-toggle').click();

  // Validate to step 2 (Delivery)
  await page.locator('#cart-validate').click();

  // Focus should shift to #delivery-name
  const nameInput = page.locator('#delivery-name');
  await expect(nameInput).toBeFocused();

  // Fill required delivery fields and validate to step 3 (Payment)
  await nameInput.fill('Mamadou Diallo');
  await page.locator('#delivery-phone').fill('628069479');
  await page.locator('#delivery-address').fill('Kaloum');
  await page.locator('#cart-validate').click();

  // Focus should shift to first payment option
  const firstPaymentOption = page.locator('.payment-option').first();
  await expect(firstPaymentOption).toBeFocused();
});

test('cart drawer toggle labels sync dynamically and key C opens cart drawer', async ({ page }) => {
  await page.goto('/');

  const headerCartToggle = page.locator('#header-cart-toggle');

  // Verify initial empty state aria-label and title
  await expect(headerCartToggle).toHaveAttribute('aria-label', 'Ouvrir le panier (vide) — Touche C');
  await expect(headerCartToggle).toHaveAttribute('title', 'Ouvrir le panier (vide) [C]');

  // Add item to cart
  await page.locator('.add-to-cart').first().click();

  // Verify updated aria-label and title with item count
  await expect(headerCartToggle).toHaveAttribute('aria-label', 'Ouvrir le panier (1 article) — Touche C');
  await expect(headerCartToggle).toHaveAttribute('title', 'Ouvrir le panier (1 article) [C]');

  // Press key 'c' to open cart drawer
  await page.keyboard.press('c');

  // Cart drawer should be visible with is-open class
  const cartDrawer = page.locator('#cart-drawer');
  await expect(cartDrawer).toHaveClass(/is-open/);

  // Label should change to close cart
  await expect(headerCartToggle).toHaveAttribute('aria-label', 'Fermer le panier');
  await expect(headerCartToggle).toHaveAttribute('title', 'Fermer le panier (Échap)');

  // Press Escape to close
  await page.keyboard.press('Escape');
  await expect(cartDrawer).not.toHaveClass(/is-open/);
  await expect(headerCartToggle).toHaveAttribute('aria-label', 'Ouvrir le panier (1 article) — Touche C');
});

test('dish cards update in-cart badge and aria-label dynamically', async ({ page }) => {
  await page.goto('/');

  const firstDishCard = page.locator('.dish-card').first();
  const firstAddBtn = firstDishCard.locator('.add-to-cart');
  const badge = firstDishCard.locator('.dish-cart-count');

  // Verify badge is initially non-existent or hidden
  await expect(badge).toBeHidden();

  // Click add to cart
  await firstAddBtn.click();

  // Verify badge becomes visible with '1 dans le panier'
  await expect(badge).toBeVisible();
  await expect(badge).toHaveText('1 dans le panier');
  await expect(firstAddBtn).toHaveAttribute('aria-label', /1 dans le panier/);

  // Click add to cart a second time
  await firstAddBtn.click();

  // Verify count updates to '2 dans le panier'
  await expect(badge).toHaveText('2 dans le panier');
  await expect(firstAddBtn).toHaveAttribute('aria-label', /2 dans le panier/);

  // Capture screenshot of updated dish card with in-cart badge
  const dishCardScreenshotPath = '/home/jules/verification/verification_dish_badge.png';
  await firstDishCard.screenshot({ path: dishCardScreenshotPath });
  console.log('Dish card badge screenshot saved to:', dishCardScreenshotPath);
});
