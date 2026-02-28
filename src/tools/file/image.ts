import { z } from 'zod';
import { readFileSync, existsSync } from 'fs';
import { extname } from 'path';
import type { ToolDefinition } from '../types.js';

const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.bmp', '.webp']);

export const useLocalImageTool: ToolDefinition = {
  name: 'use_local_image',
  description: 'Load a local image file and get a screenshot ID for it. Use this to reference local images in your report via [Image:img_X].',
  parameters: z.object({
    path: z.string().describe('Absolute path to the image file'),
    label: z.string().default('local').describe('Label for the image (e.g. "chart", "photo")'),
  }),
  async execute(args, ctx) {
    if (!existsSync(args.path)) {
      return { type: 'text', content: `Error: File not found: ${args.path}` };
    }

    const ext = extname(args.path).toLowerCase();
    if (!IMAGE_EXTS.has(ext)) {
      return { type: 'text', content: `Error: Not a supported image format (${ext}). Supported: ${[...IMAGE_EXTS].join(', ')}` };
    }

    const buf = readFileSync(args.path);
    const mimeType = (ext === '.png') ? 'image/png' as const : 'image/jpeg' as const;
    const base64 = buf.toString('base64');
    const id = ctx.screenshots.save(base64, mimeType, args.label);

    return {
      type: 'image',
      base64,
      mimeType,
      screenshotId: id,
    };
  },
};
