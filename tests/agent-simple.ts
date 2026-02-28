/**
 * Test: 完整 agent 流程 — 小模型截图并汇报。
 * Usage: npx tsx tests/agent-simple.ts
 * Requires: WINDOWS_USE_API_KEY / BASE_URL / MODEL configured (env or ~/.windows-use.json)
 */

import { loadConfig } from '../src/config/loader.js';
import { SessionRegistry } from '../src/mcp/session-registry.js';

async function main() {
  let config;
  try {
    config = loadConfig();
  } catch (err) {
    console.error('❌ Config not set. Run `npm run init` first or set env vars.');
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }

  console.log(`Model: ${config.model}`);
  console.log(`Base URL: ${config.baseURL}`);
  console.log(`Max steps: ${config.maxSteps}\n`);

  const registry = new SessionRegistry();
  const session = registry.create(config);
  console.log(`Session created: ${session.id}\n`);

  console.log('--- Sending instruction: "截取当前屏幕，告诉我你看到了什么" ---\n');

  const result = await session.runner.run('截取当前屏幕，告诉我你看到了什么');

  console.log('\n--- Result ---');
  console.log(`Status: ${result.status}`);
  console.log(`Summary: ${result.summary}`);
  console.log(`Steps used: ${result.stepsUsed}`);
  if (result.screenshot) {
    console.log(`Screenshot: (${result.screenshot.length} chars base64)`);
  }

  await registry.destroy(session.id);
  console.log('\nSession destroyed. Done.');
}

main().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
