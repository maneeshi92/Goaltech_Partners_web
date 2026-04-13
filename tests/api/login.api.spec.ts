import { test, expect } from '@playwright/test';

const API_BASE_URL = 'https://goaltech-partners-web.onrender.com';

test.describe('Login API Automation - Positive & Negative Scenarios', () => {

  // 🟢 POSITIVE SCENARIO: Happy Path
  test('should return 200 and a JWT token for valid credentials', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/login`, {
      data: {
        email: 'maneeshipj@gmail.com',
        password: 'DataB1ade7@@'
      }
    });

    // Assert Status is successful
    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);

    // Assert JSON Payload structure
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.token).toBeDefined(); // Ensures a security token was generated
    expect(body.user.email).toBe('maneeshipj@gmail.com');
  });

  // 🔴 NEGATIVE SCENARIO 1: Incorrect Password
  test('should return 401 Unauthorized for incorrect password', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/login`, {
      data: {
        email: 'maneeshipj@gmail.com',
        password: 'wrongPassword123!'
      }
    });

    expect(response.status()).toBe(401);
    
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.message).toBe('Incorrect password');
  });

  // 🔴 NEGATIVE SCENARIO 2: Unregistered / Bad Email
  test('should return 401 Unauthorized for a non-existent email', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/login`, {
      data: {
        email: 'nobody@nowhere.com',
        password: 'somePassword'
      }
    });

    expect(response.status()).toBe(401);
    
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.message).toBe('No account found with this email');
  });

  // 🔴 NEGATIVE SCENARIO 3: Missing Fields (Bad Request)
  test('should return 400 Bad Request when password is not sent', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/login`, {
      data: {
        email: 'maneeshipj@gmail.com'
        // Missing password completely
      }
    });

    // The API should reject incomplete payloads
    expect(response.status()).toBe(400);

    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.message).toBe('Email and password are required');
  });

});
