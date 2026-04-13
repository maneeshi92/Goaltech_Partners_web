import { type Locator, type Page } from '@playwright/test';

export class LandingPage {
  readonly page: Page;
  readonly signInBtn: Locator;

  constructor(page: Page) {
    this.page = page;
    // Locator for finding the sign in or login button dynamically
    this.signInBtn = page.locator('#go-to-login, #mobile-tab-login-reg');
  }

  async goto() {
    await this.page.goto('https://goaltech-partners-web.onrender.com/');
  }

  async clickSignIn() {
    // Graceful navigation if the landing page actually has a standalone click button
    if (await this.signInBtn.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await this.signInBtn.first().click();
    }
  }
}
