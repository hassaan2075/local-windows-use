/**
 * Test: 截取桌面屏幕。
 * Usage: npx tsx tests/screenshot.ts
 */

import { Monitor } from 'node-screenshots';

function main() {
  console.log('1. Listing monitors...');
  const monitors = Monitor.all();
  for (const m of monitors) {
    console.log(`   - ${m.id}: ${m.width}x${m.height} (primary: ${m.isPrimary})`);
  }

  const primary = monitors.find((m) => m.isPrimary) ?? monitors[0];
  if (!primary) {
    console.error('❌ No monitor found');
    process.exit(1);
  }

  console.log(`2. Capturing primary monitor (${primary.width}x${primary.height})...`);
  const image = primary.captureImageSync();
  const buf = image.toPngSync();
  console.log(`   ✅ Captured ${buf.length} bytes`);

  const { writeFileSync } = require('fs');
  writeFileSync('tests/desktop-screenshot.png', buf);
  console.log('   ✅ Saved to tests/desktop-screenshot.png\n');
}

main();
