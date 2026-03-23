import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../infra/prisma/prisma.service';
import { ToolCallCatalogMetadata, InternalToolRequest } from './tool-call-log.types';

@Injectable()
export class ToolCallLogMetadataResolver {
  constructor(private readonly prisma: PrismaService) {}

  async resolve(
    request: InternalToolRequest,
    agentCode?: string,
  ): Promise<ToolCallCatalogMetadata> {
    const method = request.method.toUpperCase();
    const routePath = this.resolveRoutePath(request);
    const normalizedPath = this.normalizeRoutePath(request, routePath);
    const resolvedAgentCode = agentCode ?? this.inferAgentCode(normalizedPath);

    const [apiRecord, agentGroupRecord] = await Promise.all([
      this.prisma.backend_api_catalog.findFirst({
        where: {
          http_method: method,
          path: normalizedPath,
        },
        select: {
          id: true,
        },
      }),
      resolvedAgentCode
        ? this.prisma.agent_groups.findUnique({
            where: {
              code: resolvedAgentCode,
            },
            select: {
              id: true,
            },
          })
        : Promise.resolve(null),
    ]);

    const toolRecord =
      apiRecord && agentGroupRecord
        ? await this.prisma.agent_group_tools.findFirst({
            where: {
              agent_group_id: agentGroupRecord.id,
              is_allowed: true,
              tools: {
                api_id: apiRecord.id,
              },
            },
            select: {
              tool_id: true,
            },
          })
        : null;

    return {
      normalizedPath,
      routePath,
      method,
      apiId: apiRecord?.id ?? null,
      toolId: toolRecord?.tool_id ?? null,
      agentGroupId: agentGroupRecord?.id ?? null,
    };
  }

  private resolveRoutePath(request: InternalToolRequest) {
    if (typeof request.route?.path === 'string') {
      return request.route.path;
    }

    return this.stripQueryString(request.originalUrl ?? request.url ?? '/');
  }

  private normalizeRoutePath(request: InternalToolRequest, routePath: string) {
    const basePath = this.ensureLeadingSlash(request.baseUrl ?? '');
    const sanitizedRoutePath = this.ensureLeadingSlash(
      this.stripQueryString(routePath),
    );

    if (!basePath || sanitizedRoutePath.startsWith(basePath)) {
      return sanitizedRoutePath;
    }

    return `${basePath}${sanitizedRoutePath}`.replace(/\/+/g, '/');
  }

  private stripQueryString(value: string) {
    return value.split('?')[0] || '/';
  }

  private ensureLeadingSlash(value: string) {
    if (!value) {
      return '';
    }

    return value.startsWith('/') ? value : `/${value}`;
  }

  private inferAgentCode(normalizedPath: string) {
    if (
      normalizedPath === '/api/quiz/submit' ||
      /\/api\/quiz\/[^/]+\/result$/.test(normalizedPath)
    ) {
      return 'learning_training_agent';
    }

    return undefined;
  }
}
