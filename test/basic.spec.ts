import { test, expect } from '@playwright/test';

const basePath = process.env.CI ? '/' : '/mini-trader/';

test('首页加载', async ({ page }) => {
  await page.goto(basePath);
  await expect(page).toHaveTitle(/Mini Crypto Trader/);
});

test('买单挂单生成', async ({ page }) => {
  await page.goto(basePath);
  // 切换到买入
  await page.getByTestId('trade-buy-btn').click();
  // 填写价格和数量
  await page.getByTestId('trade-price-input').fill('10000');
  await page.getByTestId('trade-amount-input').fill('0.01');
  // 提交下单
  await page.getByTestId('trade-submit-btn').click();
  // 检查挂单表格出现买单
  await expect(page.getByTestId('order-row-buy')).toBeVisible();
  await expect(page.getByTestId('trade-amount-input')).toBeVisible();
  await expect(page.getByTestId('trade-price-input')).toBeVisible();
});
