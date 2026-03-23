import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { BuiltPromptContext } from '../context-builder/context-builder.service';

export interface OpenclawRunRequest {
  agentName: string;
  message: string;
  context: BuiltPromptContext;
  internalToken: string;
  conversationId: string;
  userId: string;
  traceId: string;
}

export interface OpenclawRunResponse {
  text: string;
  uiPayload: Record<string, unknown> | null;
}

@Injectable()
export class OpenclawService {
  constructor(private readonly configService: ConfigService) {}

  async run(request: OpenclawRunRequest): Promise<OpenclawRunResponse> {
    const baseUrl = this.configService.get<string>('openclaw.baseUrl')?.trim();
    const apiKey = this.configService.get<string>('openclaw.apiKey')?.trim();

    if (!baseUrl) {
      throw new ServiceUnavailableException({
        code: 'OPENCLAW_TIMEOUT',
        message: 'OpenClaw base URL is not configured.',
        details: {},
      });
    }

    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/run`, {
      method: 'POST',
      headers: this.buildHeaders(apiKey),
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new ServiceUnavailableException({
        code: 'OPENCLAW_TIMEOUT',
        message: 'OpenClaw request failed.',
        details: {
          status: response.status,
        },
      });
    }

    const payload = (await response.json()) as unknown;

    return {
      text: this.readString(payload, [
        ['text'],
        ['finalAnswer'],
        ['answer'],
        ['data', 'text'],
        ['data', 'finalAnswer'],
        ['data', 'answer'],
      ]),
      uiPayload: this.readObject(payload, [
        ['uiPayload'],
        ['data', 'uiPayload'],
        ['metadata', 'uiPayload'],
      ]),
    };
  }

  private buildHeaders(apiKey: string | undefined) {
    return {
      'Content-Type': 'application/json',
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    };
  }

  private readString(source: unknown, paths: string[][]) {
    for (const path of paths) {
      const value = this.readPath(source, path);

      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }
    }

    return '';
  }

  private readObject(source: unknown, paths: string[][]) {
    for (const path of paths) {
      const value = this.readPath(source, path);

      if (value && typeof value === 'object' && !Array.isArray(value)) {
        return value as Record<string, unknown>;
      }
    }

    return null;
  }

  private readPath(source: unknown, path: string[]) {
    let current: unknown = source;

    for (const key of path) {
      if (!current || typeof current !== 'object' || Array.isArray(current)) {
        return undefined;
      }

      current = (current as Record<string, unknown>)[key];
    }

    return current;
  }
}
