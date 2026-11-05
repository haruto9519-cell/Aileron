const { test, expect } = require('@playwright/test');

 test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('home screen and navigation render', async ({ page }) => {
  await expect(page).toHaveTitle(/買いまも/);
  await expect(page.getByRole('heading', { name: /買う前から/ })).toBeVisible();
  await page.getByRole('button', { name: /ショップをチェックする/ }).first().click();
  await expect(page.locator('#panel-safety')).toHaveClass(/active/);
});

test('shop checker rejects malformed URLs and explains its limits', async ({ page }) => {
  await page.locator('#shopUrl').fill('not-a-url');
  await page.getByRole('button', { name: 'チェック結果を見る' }).click();
  await expect(page.locator('#shopResult')).toContainText('URLを確認してください');
  await page.locator('#shopUrl').fill('https://example.com');
  await page.locator('#cCompany').check();
  await page.locator('#cContact').check();
  await page.getByRole('button', { name: 'チェック結果を見る' }).click();
  await expect(page.locator('#shopResult')).toContainText('入力URL');
  await expect(page.locator('#shopResult')).toContainText('安全を保証しません');
});

test('purchase records can be created, edited, persisted and deleted safely', async ({ page }) => {
  await page.getByRole('button', { name: /購入を追加/ }).click();
  await page.locator('#rName').fill('<img src=x onerror=alert(1)>');
  await page.locator('#rShop').fill('テストショップ');
  await page.locator('#rDate').fill('2026-11-05');
  await page.locator('#rAmount').fill('1280');
  await page.getByRole('button', { name: '保存する' }).click();
  await expect(page.locator('#statRecords')).toHaveText('1');
  await expect(page.locator('#recordsBody')).toContainText('<img src=x onerror=alert(1)>');
  await expect(page.locator('#recordsBody img')).toHaveCount(0);
  await page.reload();
  await expect(page.locator('#statRecords')).toHaveText('1');
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: '削除' }).click();
  await expect(page.locator('#statRecords')).toHaveText('0');
});

test('deadlines are saved and reflected in the dashboard counters', async ({ page }) => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 2);
  const date = [tomorrow.getFullYear(), String(tomorrow.getMonth()+1).padStart(2,'0'), String(tomorrow.getDate()).padStart(2,'0')].join('-');
  await page.getByRole('button', { name: /期限を追加/ }).click();
  await page.locator('#dName').fill('テスト返品期限');
  await page.locator('#dDate').fill(date);
  await page.getByRole('button', { name: '保存する' }).click();
  await expect(page.locator('#statSoon')).toHaveText('1');
  await page.getByRole('button', { name: 'すべて見る' }).click();
  await expect(page.locator('#deadlinesBody')).toContainText('テスト返品期限');
});

test('backup export starts a JSON download', async ({ page }) => {
  await page.getByRole('button', { name: 'データ・設定' }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: '書き出す' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^kaimamo-backup-.*\\.json$/);
});
