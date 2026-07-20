import os
from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        # We can use file paths directly
        cwd = os.getcwd()

        # Homepage screenshot
        page = browser.new_page()
        page.set_viewport_size({"width": 1280, "height": 900})
        page.goto(f"file://{cwd}/index.html")
        page.screenshot(path="verification/homepage.png")

        # Contact page screenshot
        page.goto(f"file://{cwd}/pages/contact.html")
        page.screenshot(path="verification/contact.png")

        # Cart drawer screenshot
        page.goto(f"file://{cwd}/index.html")
        # Add a dish to cart to show the badge & drawer style
        # When clicked, the drawer opens automatically (since clicking add-to-cart opens drawer)
        page.click("button[data-name='Brochettes de bœuf']")
        page.wait_for_timeout(1000)
        # Take a screenshot showing the drawer
        page.screenshot(path="verification/cart_drawer.png")

        browser.close()

if __name__ == "__main__":
    run()
