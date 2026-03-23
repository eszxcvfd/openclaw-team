"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentScope = exports.AGENT_SCOPE_KEY = void 0;
const common_1 = require("@nestjs/common");
exports.AGENT_SCOPE_KEY = 'agent_scope';
const AgentScope = (...scopes) => (0, common_1.SetMetadata)(exports.AGENT_SCOPE_KEY, scopes);
exports.AgentScope = AgentScope;
//# sourceMappingURL=agent-scope.decorator.js.map