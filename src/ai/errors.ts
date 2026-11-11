import type { AIErrorKind } from './types';

export class AIError extends Error {
  readonly kind: AIErrorKind;
  readonly status?: number;

  constructor(kind: AIErrorKind, message: string, status?: number) {
    super(message);
    this.name = 'AIError';
    this.kind = kind;
    this.status = status;
  }
}

export function toAIError(error: unknown): AIError {
  if (error instanceof AIError) return error;
  if (error instanceof Error) {
    if (error.name === 'AbortError') {
      return new AIError('network', 'The AI request timed out.');
    }
    return new AIError('network', error.message);
  }
  return new AIError('network', 'The AI request failed.');
}

export function aiErrorMessage(error: unknown): string {
  if (error instanceof AIError && error.status === 404) {
    return 'The selected AI model is not available. Choose another model in AI settings.';
  }
  if (error instanceof AIError && error.status === 400) {
    return 'The provider rejected the request. Check the selected model and API key.';
  }

  const kind = error instanceof AIError ? error.kind : 'network';
  switch (kind) {
    case 'not_configured':
      return 'Add an API key in AI settings first.';
    case 'offline':
      return 'You are offline. Connect to the internet to use AI.';
    case 'auth':
      return 'The API key was rejected. Check it in AI settings.';
    case 'rate_limit':
      return 'The provider free limit was reached. Try again later or switch providers.';
    case 'provider':
      return 'The AI provider returned an error. Try again in a moment.';
    case 'invalid_response':
      return 'The AI response could not be read. Try again.';
    case 'network':
    default:
      return 'Could not reach the AI provider. Check your connection and try again.';
  }
}
