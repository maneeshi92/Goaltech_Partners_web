import { test, expect } from '@playwright/test';
import { LandingPage } from '../pages/LandingPage';
import { LoginPage } from '../pages/LoginPage';

test.describe('Login flow and Test Automation Scenario', () => {
  test('should navigate to website, sign in, and test password visibility', async ({ page }) => {
    // Initialize Page Objects
    const landingPage = new LandingPage(page);
    const loginPage = new LoginPage(page);

    // 1. User will land on this page
    await landingPage.goto();

    // 2. Click sign button it will take the user to sign in page
    await landingPage.clickSignIn();

    // 3. User enter username and password
    await loginPage.fillEmail('maneeshipj@gmail.com');
    await loginPage.fillPassword('DataB1ade7@@');

    // Test the eye icon to view and hide password
    await loginPage.togglePasswordVisibility();

    // 4. Then user can sign in
    await loginPage.signIn();
  });
});
