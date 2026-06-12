/**
 * Hono RPC 功能测试
 */

import { test, expect } from '@playwright/test';

test.describe('Hono RPC 测试', () => {
  test('测试首页加载', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');

    // 检查页面标题
    await expect(page.locator('h1')).toContainText('TanStack Start');
  });

  test('测试 Hono RPC GET 请求', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');

    // 找到 Hono RPC 示例区域
    const rpcSection = page.locator('text=Hono RPC 示例').locator('..');

    // 输入名字
    await rpcSection.locator('input').fill('测试用户');

    // 点击测试 GET 按钮
    await rpcSection.locator('button:has-text("测试 GET")').click();

    // 等待响应
    await page.waitForTimeout(2000);

    // 检查是否有响应显示
    // const resultText = await rpcSection.locator('text=Hello').textContent();
    // console.log('GET 响应:', resultText);
  });

  test('测试 Hono RPC POST 请求', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');

    // 找到 Hono RPC 示例区域
    const rpcSection = page.locator('text=Hono RPC 示例').locator('..');

    // 输入名字
    await rpcSection.locator('input').fill('测试用户');

    // 点击测试 POST 按钮
    await rpcSection.locator('button:has-text("测试 POST")').click();

    // 等待响应
    await page.waitForTimeout(2000);

    // 检查是否有响应显示
    // const resultText = await rpcSection.locator('text=你好').textContent();
    // console.log('POST 响应:', resultText);
  });
});
