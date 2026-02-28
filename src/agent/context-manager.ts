import type OpenAI from 'openai';

type Message = OpenAI.Chat.Completions.ChatCompletionMessageParam;

/**
 * Simple message history — stores all messages without windowing.
 * Small models are cheap, no need to truncate context.
 */
export class ContextManager {
  private messages: Message[] = [];

  append(message: Message): void {
    this.messages.push(message);
  }

  /** Returns all messages. */
  getMessages(): Message[] {
    return [...this.messages];
  }

  /** Total messages stored. */
  get length(): number {
    return this.messages.length;
  }
}
