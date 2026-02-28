/**
 * Test: 鼠标移动 + 键盘输入。
 * Usage: npx tsx tests/mouse-keyboard.ts
 * Note: 会真实控制你的鼠标和键盘！
 */

async function main() {
  const nut = await import('@nut-tree-fork/nut-js');

  console.log('1. Getting screen size...');
  const width = await nut.screen.width();
  const height = await nut.screen.height();
  console.log(`   ✅ Screen: ${width}x${height}`);

  console.log('2. Moving mouse to center...');
  const center = new nut.Point(Math.round(width / 2), Math.round(height / 2));
  await nut.mouse.move(nut.straightTo(center));
  const pos = await nut.mouse.getPosition();
  console.log(`   ✅ Mouse at (${pos.x}, ${pos.y})`);

  console.log('3. Typing text (open a text editor first!)...');
  // Give you 3 seconds to click into a text editor
  console.log('   ⏳ 3 seconds to focus a text input...');
  await new Promise((r) => setTimeout(r, 3000));
  await nut.keyboard.type('Hello from windows-use!');
  console.log('   ✅ Typed text\n');
}

main().catch((err) => {
  console.error('❌ Test failed:', err.message);
  process.exit(1);
});
