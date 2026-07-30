import { Injectable, ServiceUnavailableException } from '@nestjs/common';

interface ResponsesApiMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ResponsesApiResult {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      text?: string;
    }>;
  }>;
  error?: {
    message?: string;
  };
}

@Injectable()
export class OpenAiClientService {
  private readonly apiKey = (process.env.OPENAI_API_KEY || '').trim();
  private readonly model = (process.env.OPENAI_MODEL || 'gpt-4.1-mini').trim();
  private readonly baseUrl = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1')
    .trim()
    .replace(/\/$/, '');
  private readonly organizationId = (process.env.OPENAI_ORG_ID || '').trim();
  private readonly projectId = (process.env.OPENAI_PROJECT_ID || '').trim();

  async createTextResponse(params: {
    messages: ResponsesApiMessage[];
    temperature: number;
    maxOutputTokens: number;
  }): Promise<string> {
    if (!this.apiKey) {
      throw new ServiceUnavailableException('OPENAI_API_KEY is not configured');
    }

    const response = await fetch(`${this.baseUrl}/responses`, {
      method: 'POST',
      headers: this.buildHeaders(),
      body: JSON.stringify({
        model: this.model,
        input: params.messages,
        temperature: params.temperature,
        max_output_tokens: params.maxOutputTokens
      })
    });

    const payload = await response.json().catch(() => null) as ResponsesApiResult | null;

    if (!response.ok) {
      const message = payload?.error?.message || 'OpenAI API request failed';
      throw new ServiceUnavailableException(this.sanitizeOpenAiMessage(message));
    }

    const text = this.extractOutputText(payload);
    if (!text) {
      throw new ServiceUnavailableException('OpenAI API returned an empty response');
    }

    return text;
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    };

    if (this.organizationId) {
      headers['OpenAI-Organization'] = this.organizationId;
    }

    if (this.projectId) {
      headers['OpenAI-Project'] = this.projectId;
    }

    return headers;
  }

  private extractOutputText(payload: ResponsesApiResult | null): string {
    if (typeof payload?.output_text === 'string' && payload.output_text.trim()) {
      return payload.output_text.trim();
    }

    if (!Array.isArray(payload?.output)) {
      return '';
    }

    const fragments: string[] = [];
    for (const outputItem of payload.output) {
      if (!Array.isArray(outputItem.content)) {
        continue;
      }

      for (const contentItem of outputItem.content) {
        if (typeof contentItem.text === 'string' && contentItem.text) {
          fragments.push(contentItem.text);
        }
      }
    }

    return fragments.join('\n').trim();
  }

  private sanitizeOpenAiMessage(message: string): string {
    return message.replace(/sk-[A-Za-z0-9_-]+/g, 'sk-***');
  }
}
