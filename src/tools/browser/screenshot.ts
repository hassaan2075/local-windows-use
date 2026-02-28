import { z } from 'zod';
import type { ToolDefinition } from '../types.js';

export const browserScreenshotTool: ToolDefinition = {
  name: 'browser_screenshot',
  description: 'Take a screenshot of the current browser page. Returns a screenshot ID (e.g. img_2) that you can reference later in report.',
  parameters: z.object({
    fullPage: z.boolean().default(false).describe('Whether to capture the full scrollable page'),
  }),
  async execute(args, ctx) {
    const browser = await ctx.getBrowser();
    const page = await browser.getPage();
    const buf = await page.screenshot({
      type: 'jpeg',
      quality: 70,
      fullPage: args.fullPage,
      scale: 'css',
    });
    const base64 = buf.toString('base64');
    const id = ctx.screenshots.save(base64, 'image/jpeg', 'browser');

    return {
      type: 'image',
      base64,
      mimeType: 'image/jpeg',
      screenshotId: id,
    };
  },
};
