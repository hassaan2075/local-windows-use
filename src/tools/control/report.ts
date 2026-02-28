import { z } from 'zod';
import type { ToolDefinition } from '../types.js';

export const reportTool: ToolDefinition = {
  name: 'report',
  description:
    'Report progress back to the caller. Call this when the task is completed, when you are blocked, or when you need guidance. Calling this STOPS your execution immediately.\n\nThe content field supports rich document format: mix text with screenshots using [Image:img_1] markers. Example:\n"Here is the current state:\n[Image:img_2]\nThe page shows..."',
  parameters: z.object({
    status: z
      .enum(['completed', 'blocked', 'need_guidance'])
      .describe(
        '"completed" = task done, "blocked" = cannot proceed, "need_guidance" = need a decision',
      ),
    content: z
      .string()
      .describe('Rich report content. Use [Image:img_X] to embed screenshots captured earlier. Example: "Task done.\\n[Image:img_1]\\nThe page shows the result."'),
    data: z.unknown().optional().describe('Optional structured data to return'),
  }),
  async execute(args) {
    return {
      type: 'report',
      status: args.status,
      content: args.content,
      data: args.data,
    };
  },
};
