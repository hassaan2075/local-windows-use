/**
 * Test: 自动查找并启动 Chrome，连接 CDP，打开页面，截图。
 * Usage: npx tsx tests/browser-launch.ts
 */

import { BrowserClient } from '../src/tools/browser/client.js';

async function main() {
  const client = new BrowserClient('http://localhost:9222');

  console.log('1. Connecting to Chrome (will auto-launch if needed)...');
  const page = await client.getPage();
  console.log('   ✅ Connected');

  console.log('2. Navigating to example.com...');
  await page.goto('https://example.com', { waitUntil: 'domcontentloaded' });
  const title = await page.title();
  console.log(`   ✅ Page title: "${title}"`);

  console.log('3. Taking screenshot...');
  const buf = await page.screenshot({ type: 'png' });
  const { writeFileSync } = await import('fs');
  writeFileSync('tests/browser-screenshot.png', buf);
  console.log(`   ✅ Saved to tests/browser-screenshot.png (${buf.length} bytes)`);

  console.log('4. Getting page text...');
  const text = await page.innerText('body');
  console.log(`   ✅ Body text (first 200 chars): "${text.slice(0, 200)}"`);

  console.log('5. Disconnecting (Chrome stays open)...');
  await client.close();
  console.log('   ✅ Done\n');
}

main().catch((err) => {
  console.error('❌ Test failed:', err.message);
  process.exit(1);
});
