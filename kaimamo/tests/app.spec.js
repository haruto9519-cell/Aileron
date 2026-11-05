const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('home screen and navigation render', async ({ page }) => {
  await expect(page).toHaveTitle(/買いまも/);
  await expect(page.getByRole('heading', { name: /ネット通販の購入記録・返品期限/ })).toBeVisible();
  await page.getByRole('button', { name: /ショップをチェックする/ }).first().click();
  await expect(page.locator('#panel-safety')).toHaveClass(/active/);
});

test('shop checker rejects malformed URLs and explains its limits', async ({ page }) => {
  await page.locator('[data-panel="safety"]').click();
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

test('purchase records can be created, persisted and deleted safely', async ({ page }) => {
  await page.locator('[data-panel="records"]').click();
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
  await page.locator('[data-panel="records"]').click();
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: '削除' }).click();
  await expect(page.locator('#statRecords')).toHaveText('0');
});

test('deadlines are saved and reflected in the dashboard counters', async ({ page }) => {
  await page.getByRole('button', { name: /期限管理/ }).click();
  const soon = new Date();
  soon.setDate(soon.getDate() + 2);
  const date = [soon.getFullYear(), String(soon.getMonth()+1).padStart(2,'0'), String(soon.getDate()).padStart(2,'0')].join('-');
  await page.getByRole('button', { name: /期限を追加/ }).click();
  await page.locator('#dName').fill('テスト返品期限');
  await page.locator('#dDate').fill(date);
  await page.getByRole('button', { name: '保存する' }).click();
  await expect(page.locator('#statSoon')).toHaveText('1');
  await expect(page.locator('#deadlinesBody')).toContainText('テスト返品期限');
});

test('backup export starts a JSON download', async ({ page }) => {
  await page.getByRole('button', { name: 'データ・設定' }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: '書き出す' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^kaimamo-backup-.*\.json$/);
});

test('return and refund navigator creates a plan and saves a case', async ({ page }) => {
  await page.locator('[data-panel="returns"]').click();
  await page.locator('#returnIssue').selectOption('return');
  await page.locator('#returnShop').fill('テストショップ');
  await page.locator('#returnDetails').fill('サイズが合わなかった');
  await page.getByRole('button', { name: '対応手順を表示' }).click();
  await expect(page.locator('#returnPlan')).toContainText('返品・交換したい');
  await expect(page.locator('#returnPlan')).toContainText('テストショップ');
  await page.locator('#caseName').fill('テスト返品案件');
  await page.locator('#caseStatus').selectOption('問い合わせ済み');
  await page.locator('#caseMemo').fill('動作確認');
  await page.getByRole('button', { name: '案件を保存' }).click();
  await expect(page.locator('#casesList')).toContainText('テスト返品案件');
  await page.reload();
  await page.locator('[data-panel="returns"]').click();
  await expect(page.locator('#casesList')).toContainText('テスト返品案件');
});

test('evidence vault saves a note and uploaded file in IndexedDB', async ({ page }) => {
  await page.locator('[data-panel="evidence"]').click();
  await page.locator('#evidenceCase').fill('テスト商品の証拠');
  await page.locator('#evidenceNote').fill('到着時の状態を記録');
  await page.locator('#evidenceFile').setInputFiles({
    name: 'evidence.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('test evidence')
  });
  await page.getByRole('button', { name: '記録を保存' }).click();
  await expect(page.locator('#evidenceList')).toContainText('テスト商品の証拠');
  await expect(page.locator('#evidenceList')).toContainText('evidence.txt');
  await page.reload();
  await page.locator('[data-panel="evidence"]').click();
  await expect(page.locator('#evidenceList')).toContainText('テスト商品の証拠');
});

test('subscription renewal is saved and counted on the dashboard', async ({ page }) => {
  await page.locator('[data-panel="subscriptions"]').click();
  const soon = new Date();
  soon.setDate(soon.getDate() + 3);
  const date = [soon.getFullYear(), String(soon.getMonth()+1).padStart(2,'0'), String(soon.getDate()).padStart(2,'0')].join('-');
  await page.locator('#subName').fill('テスト定期サービス');
  await page.locator('#subDate').fill(date);
  await page.locator('#subAmount').fill('980');
  await page.locator('#subCycle').selectOption('毎月');
  await page.getByRole('button', { name: '登録する' }).click();
  await expect(page.locator('#subscriptionsList')).toContainText('テスト定期サービス');
  await expect(page.locator('#statSoon')).toHaveText('1');
  await page.reload();
  await page.locator('[data-panel="subscriptions"]').click();
  await expect(page.locator('#subscriptionsList')).toContainText('テスト定期サービス');
});

test('message maker generates a contextual support message', async ({ page }) => {
  await page.locator('[data-panel="message"]').click();
  await page.locator('#msgType').selectOption('delivery');
  await page.locator('#msgShop').fill('テストショップ');
  await page.locator('#msgProduct').fill('テスト商品');
  await page.locator('#msgOrder').fill('ORDER-123');
  await page.locator('#msgDetails').fill('発送通知後、配送状況が更新されません');
  await page.getByRole('button', { name: '文章を作成' }).click();
  await expect(page.locator('#msgOutput')).toHaveValue(/テストショップ/);
  await expect(page.locator('#msgOutput')).toHaveValue(/ORDER-123/);
  await expect(page.locator('#msgOutput')).toHaveValue(/配送状況/);
});

test('arrival checklist saves selected inspection results', async ({ page }) => {
  await page.locator('[data-panel="arrival"]').click();
  await page.locator('#arrivalName').fill('テスト商品');
  await page.locator('#arrivalShop').fill('テストショップ');
  await page.locator('.arrivalCheck').nth(0).check();
  await page.locator('.arrivalCheck').nth(2).check();
  await page.locator('#arrivalMemo').fill('付属品を確認');
  await page.getByRole('button', { name: 'チェック結果を保存' }).click();
  await expect(page.locator('#arrivalList')).toContainText('テスト商品');
  await expect(page.locator('#arrivalList')).toContainText('確認済み：2/6');
  await page.reload();
  await page.locator('[data-panel="arrival"]').click();
  await expect(page.locator('#arrivalList')).toContainText('テスト商品');
});

test('purchase workspace creates a case and carries details into related tools', async ({ page }) => {
  await page.locator('[data-panel="workspace"]').click();
  await page.locator('#wsName').fill('統合ワークスペーステスト');
  await page.locator('#wsShop').fill('テストショップ');
  await page.locator('#wsProduct').fill('テスト商品');
  await page.getByRole('button', { name: '案件を作成' }).click();
  await expect(page.locator('#workspaceList')).toContainText('統合ワークスペーステスト');
  await page.getByRole('button', { name: '購入前診断へ' }).click();
  await expect(page.locator('#riskShop')).toHaveValue('テストショップ');
  await expect(page.locator('#riskProduct')).toHaveValue('テスト商品');
});
