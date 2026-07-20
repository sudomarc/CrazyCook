const { test, expect } = require('@playwright/test');

test.describe('CrazyCook restaurant template', () => {
  test('should show the hero section and main navigation', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    await expect(page).toHaveTitle(/CrazyCook/i);

    await expect(page.locator('header .logo')).toBeVisible();
    await expect(page.locator('section.hero h1')).toContainText('Cuisine de rue');
    await expect(page.locator('nav.main-nav a[href="#menu"]')).toBeVisible();
  });

  test('should add a dish to the cart and reach the delivery form', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    await expect(page.locator('#menu')).toBeVisible();
    await expect(page.locator('#galerie')).toBeVisible();

    // Add a dish first (cart modal should not open automatically)
    await page.locator('.add-to-cart').first().click();
    await expect(page.locator('#header-cart-count')).toContainText('1');
    await expect(page.locator('#cart-drawer')).toHaveAttribute('aria-hidden', 'true');

    // Click the toggle to open the cart modal manually
    await page.locator('#header-cart-toggle').click();
    await expect(page.locator('#cart-drawer')).toHaveAttribute('aria-hidden', 'false');
    await expect(page.locator('#cart-drawer')).toContainText('Soupe de haricot noir');

    // Proceed with validating the order
    await page.locator('#cart-validate').click();
    await expect(page.locator('#cart-drawer')).toContainText('Informations de livraison');
  });
});
