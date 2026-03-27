export interface ErrorContext {
  command: string;
  exitCode: number;
  stdout: string;
  stderr: string;
  shell: string;
  cwd: string;
}

export interface CommandExplanation {
  summary: string;
  parts: { token: string; meaning: string }[];
  variants?: string[];
}

export interface CompletionContext {
  input: string;
  cwd: string;
  shell: string;
  history: string[];
}

export interface Suggestion {
  text: string;
  description: string;
  confidence: number;
}

export interface AIProvider {
  name: string;
  isAvailable(): Promise<boolean>;
  explainError(ctx: ErrorContext): AsyncGenerator<string>;
  naturalToCommand(input: string, shell: string): AsyncGenerator<string>;
  explainCommand(command: string): Promise<CommandExplanation>;
  suggestCompletion(ctx: CompletionContext): Promise<Suggestion[]>;
}
