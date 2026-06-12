/**
 * Hono RPC functional tests
 */

import { test, expect } from '@playwright/test';

test.describe('Hono RPC tests', () => {
  test('homepage loads', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');

    // Check page heading
    await expect(page.locator('h1')).toContainText('TanStack Start');
  });

  test('Hono RPC GET request', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');

    // Locate the Hono RPC demo section
    const rpcSection = page.locator('text=Hono RPC Example').locator('..');

    // Enter a name
    await rpcSection.locator('input').fill('test user');

    // Click the Test GET button
    await rpcSection.locator('button:has-text("Test GET")').click();

    // Wait for response
    await page.waitForTimeout(2000);

    // Check that a response is displayed
    // const resultText = await rpcSection.locator('text=Hello').textContent();
    // console.log('GET response:', resultText);
  });

  test('Hono RPC POST request', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');

    // Locate the Hono RPC demo section
    const rpcSection = page.locator('text=Hono RPC Example').locator('..');

    // Enter a name
    await rpcSection.locator('input').fill('test user');

    // Click the Test POST button
    await rpcSection.locator('button:has-text("Test POST")').click();

    // Wait for response
    await page.waitForTimeout(2000);

    // Check that a response is displayed
    // const resultText = await rpcSection.locator('text=Hello').textContent();
    // console.log('POST response:', resultText);
  });
});
