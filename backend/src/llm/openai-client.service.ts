import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ProxyAgent, type Dispatcher } from 'undici';

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

const TRUE_VALUES = new Set(['1', 'true', 'yes', 'on']);
const DEFAULT_OUTBOUND_TIMEOUT_MS = 60_000;

type ProxyFetchInit = RequestInit & {
  dispatcher?: Dispatcher;
};

function parseBooleanEnv(rawValue: string | undefined, defaultValue: boolean): boolean {
  if (!rawValue) {
    return defaultValue;
  }

  return TRUE_VALUES.has(rawValue.trim().toLowerCase());
}

function normalizeNoProxyRule(rawRule: string): string {
  const trimmed = rawRule.trim().toLowerCase();
  if (!trimmed) {
    return '';
  }

  const withoutScheme = trimmed.replace(/^https?:\/\//, '');
  const withoutPath = withoutScheme.split('/')[0];
  return withoutPath.split(':')[0];
}

@Injectable()
export class OpenAiClientService {
  private readonly logger = new Logger(OpenAiClientService.name);
  private readonly apiKey = (process.env.OPENAI_API_KEY || '').trim();
  private readonly model = (process.env.OPENAI_MODEL || 'gpt-4.1-mini').trim();
  private readonly baseUrl = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1')
    .trim()
    .replace(/\/$/, '');
  private readonly organizationId = (process.env.OPENAI_ORG_ID || '').trim();
  private readonly projectId = (process.env.OPENAI_PROJECT_ID || '').trim();
  private readonly useProxy = parseBooleanEnv(process.env.OPENAI_USE_PROXY, true);
  private readonly proxyDebugEnabled = parseBooleanEnv(process.env.OUTBOUND_PROXY_DEBUG, false);
  private readonly outboundTimeoutMs = this.readPositiveInt(
    process.env.OUTBOUND_PROXY_TIMEOUT_MS,
    DEFAULT_OUTBOUND_TIMEOUT_MS
  );
  private readonly proxyUrl = this.resolveProxyUrl();
  private readonly proxyAgent = this.proxyUrl ? new ProxyAgent(this.proxyUrl) : null;
  private readonly noProxyRules = (process.env.OUTBOUND_PROXY_NO_PROXY || process.env.NO_PROXY || '')
    .split(',')
    .map((rule) => normalizeNoProxyRule(rule))
    .filter(Boolean);

  async createTextResponse(params: {
    messages: ResponsesApiMessage[];
    temperature: number;
    maxOutputTokens: number;
  }): Promise<string> {
    if (!this.apiKey) {
      throw new ServiceUnavailableException('OPENAI_API_KEY is not configured');
    }

    const targetUrl = `${this.baseUrl}/responses`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.outboundTimeoutMs);
    const proxyApplied = this.shouldUseProxy(targetUrl);
    const request: ProxyFetchInit = {
      method: 'POST',
      headers: this.buildHeaders(),
      body: JSON.stringify({
        model: this.model,
        input: params.messages,
        temperature: params.temperature,
        max_output_tokens: params.maxOutputTokens
      }),
      signal: controller.signal
    };

    if (proxyApplied && this.proxyAgent) {
      request.dispatcher = this.proxyAgent;
    }

    this.debugProxyRequest(targetUrl, proxyApplied);

    try {
      const response = await fetch(targetUrl, request);
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
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }

      const message = error instanceof Error ? error.message : 'OpenAI API request failed';
      throw new ServiceUnavailableException(this.sanitizeOpenAiMessage(message));
    } finally {
      clearTimeout(timeout);
    }
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

  private resolveProxyUrl(): string | null {
    const rawProxyUrl = (
      process.env.OUTBOUND_PROXY_URL
      || process.env.HTTPS_PROXY
      || process.env.HTTP_PROXY
      || ''
    ).trim();
    const proxyEnabled = parseBooleanEnv(process.env.OUTBOUND_PROXY_ENABLED, Boolean(rawProxyUrl));

    if (!proxyEnabled) {
      return null;
    }

    if (!rawProxyUrl) {
      this.logger.warn('OUTBOUND_PROXY_ENABLED is true, but proxy URL is empty');
      return null;
    }

    try {
      const parsed = new URL(rawProxyUrl);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        this.logger.warn(`Unsupported outbound proxy protocol: ${parsed.protocol}`);
        return null;
      }

      return parsed.toString();
    } catch {
      this.logger.warn('Failed to parse OUTBOUND_PROXY_URL/HTTPS_PROXY/HTTP_PROXY');
      return null;
    }
  }

  private shouldUseProxy(targetUrl: string): boolean {
    return Boolean(
      this.useProxy
      && this.proxyAgent
      && !this.isNoProxyHost(targetUrl)
    );
  }

  private isNoProxyHost(targetUrl: string): boolean {
    if (!this.noProxyRules.length) {
      return false;
    }

    let hostname = '';
    try {
      hostname = new URL(targetUrl).hostname.trim().toLowerCase();
    } catch {
      return false;
    }

    return this.noProxyRules.some((rule) => {
      if (rule === '*') {
        return true;
      }

      if (rule.startsWith('.')) {
        const plainRule = rule.slice(1);
        return hostname === plainRule || hostname.endsWith(rule);
      }

      return hostname === rule || hostname.endsWith(`.${rule}`);
    });
  }

  private debugProxyRequest(targetUrl: string, proxyApplied: boolean): void {
    if (!this.proxyDebugEnabled) {
      return;
    }

    const target = new URL(targetUrl);
    this.logger.log(
      [
        '[OUTBOUND_PROXY_DEBUG] openai_request',
        `target=${target.host}${target.pathname}`,
        `openai_use_proxy=${this.useProxy}`,
        `proxy_applied=${proxyApplied}`,
        `proxy_endpoint=${this.proxyUrl ? new URL(this.proxyUrl).host : 'none'}`,
        `timeout_ms=${this.outboundTimeoutMs}`
      ].join(' ')
    );
  }

  private readPositiveInt(rawValue: string | undefined, fallback: number): number {
    if (!rawValue) {
      return fallback;
    }

    const parsed = Number(rawValue);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return fallback;
    }

    return Math.floor(parsed);
  }
}
