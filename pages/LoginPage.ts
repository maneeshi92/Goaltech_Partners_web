import { expect, type Locator, type Page } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly eyeIcon: Locator;
  readonly textTypeInput: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.locator('#login-email');
    this.passwordInput = page.locator('#login-password');
    this.eyeIcon = page.locator('#login-screen .toggle-password');
    // Once toggle is clicked, password input changes to text:
    this.textTypeInput = page.locator('input[type="text"]#login-password');
    this.submitButton = page.locator('#login-submit-btn');
  }

  async fillEmail(email: string) {
    await expect(this.emailInput.first()).toBeVisible({ timeout: 10000 });
    await this.emailInput.first().fill(email);
  }

  async fillPassword(password: string) {
    await this.passwordInput.first().fill(password);
  }

  async togglePasswordVisibility() {
    if (await this.eyeIcon.first().isVisible().catch(() => false)) {
      // Click to reveal password
      await this.eyeIcon.first().click();
      await expect(this.textTypeInput.first()).toBeVisible();
      
      // Click again to hide password
      await this.eyeIcon.first().click();
      await expect(this.passwordInput.first()).toBeVisible();
    }
  }

  async signIn() {
    await this.submitButton.first().click();
    // Wait for network requests to settle down after submitting
    await this.page.waitForLoadState('networkidle');
  }
}
