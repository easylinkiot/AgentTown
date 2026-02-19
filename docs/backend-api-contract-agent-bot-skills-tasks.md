# AgentTown Backend API Contract (Agent / Bot / Skills / Tasks)

## 1. Scope

This contract defines the minimum backend API set to support production-grade integration for:

- `bot`
- `agents`
- `skills`
- `tasks`

It is based on current frontend behavior in `src/lib/api.ts` and `src/state/agenttown-context.tsx`, plus required capability gaps for scale and multi-device consistency.

## 2. Design Principles

- Use bearer auth for all non-auth endpoints.
- All resources should include `id`, `createdAt`, `updatedAt`, `version`.
- List endpoints should support cursor pagination: `cursor`, `limit`.
- Write endpoints should support idempotency via header:
  - `Idempotency-Key: <uuid>`
- Realtime events should be sent for all resource changes.

## 3. Shared Models

### 3.1 Task

```json
{
  "id": "task_123",
  "title": "Prepare launch post",
  "assignee": "Jason",
  "priority": "High",
  "status": "Pending",
  "dueAt": "2026-02-25T10:00:00Z",
  "sourceThreadId": "thread_1",
  "sourceMessageId": "msg_1",
  "ownerId": "user_1",
  "createdAt": "2026-02-19T09:00:00Z",
  "updatedAt": "2026-02-19T09:00:00Z",
  "version": 1
}
```

### 3.2 BotConfig

```json
{
  "name": "MyBot",
  "avatar": "https://cdn.example.com/avatar.png",
  "systemInstruction": "You are a helpful assistant.",
  "documents": ["product_prd.md"],
  "installedSkillIds": ["skill_task_decomposer"],
  "knowledgeKeywords": ["startup", "growth"],
  "updatedAt": "2026-02-19T09:00:00Z",
  "version": 12
}
```

### 3.3 Agent

```json
{
  "id": "agent_1",
  "name": "OpsBot",
  "avatar": "https://cdn.example.com/ops.png",
  "description": "Operations support agent",
  "rolePrompt": "You are an operations assistant.",
  "persona": "Calm and practical",
  "tools": ["chat", "task_decomposer"],
  "safetyLevel": "standard",
  "status": "online",
  "installedSkillIds": ["skill_task_decomposer"],
  "createdAt": "2026-02-19T09:00:00Z",
  "updatedAt": "2026-02-19T09:00:00Z",
  "version": 3
}
```

### 3.4 SkillCatalogItem / CustomSkill

```json
{
  "id": "skill_summary",
  "name": "Summary",
  "description": "Summarize messages",
  "type": "builtin",
  "permissionScope": "chat:read",
  "version": "1.0.0",
  "tags": ["nlp"]
}
```

```json
{
  "id": "custom_1",
  "name": "My Markdown Skill",
  "description": "Team-specific flow",
  "markdown": "# Skill",
  "permissionScope": "chat:read,tasks:write",
  "executor": "sandbox",
  "enabled": true,
  "version": "1.0.1",
  "createdAt": "2026-02-19T09:00:00Z",
  "updatedAt": "2026-02-19T09:00:00Z",
  "versionInt": 4
}
```

## 4. API Requirements

## 4.1 Bot

- `GET /v1/bot-config`
- `PUT /v1/bot-config`
- `POST /v1/bot/skills/:skillId` (install)
- `DELETE /v1/bot/skills/:skillId` (uninstall)

Reason:
- Current frontend updates full bot config in one shot; separate skill attach/detach avoids race conditions and reduces payload conflicts.

## 4.2 Tasks

- `GET /v1/tasks?ownerId=&assignee=&status=&priority=&cursor=&limit=`
- `POST /v1/tasks`
- `POST /v1/tasks/from-message`
- `PATCH /v1/tasks/:taskId`
- `DELETE /v1/tasks/:taskId`
- `POST /v1/tasks/batch` (optional but recommended)

Reason:
- Supports "my tasks", scalable list paging, and operational batch updates.

### Task batch request example

```json
{
  "ids": ["task_1", "task_2"],
  "patch": {
    "status": "In Progress",
    "assignee": "Jason"
  }
}
```

## 4.3 Agents

- `GET /v1/agents?cursor=&limit=`
- `POST /v1/agents`
- `PATCH /v1/agents/:agentId`
- `DELETE /v1/agents/:agentId`
- `POST /v1/agents/:agentId/skills/:skillId` with body `{ "install": true|false }`
- `POST /v1/agents/:agentId/chat`
- `POST /v1/agents/:agentId/actions/plan-and-execute` (new)

Reason:
- Existing CRUD is present; missing orchestration endpoint for production "agent executes multi-step action + task writes".

### plan-and-execute request example

```json
{
  "threadId": "thread_1",
  "userIntent": "Plan next week's launch tasks and assign owners",
  "allowedSkills": ["skill_task_decomposer", "skill_summary"],
  "dryRun": false
}
```

### plan-and-execute response example

```json
{
  "runId": "run_1",
  "steps": [
    { "type": "analyze", "status": "done" },
    { "type": "create_tasks", "status": "done", "createdTaskIds": ["task_11", "task_12"] }
  ],
  "messages": [
    { "threadId": "thread_1", "content": "I created 2 tasks." }
  ],
  "createdTaskIds": ["task_11", "task_12"],
  "status": "completed"
}
```

## 4.4 Skills

- `GET /v1/skills/catalog`
- `GET /v1/skills/custom?cursor=&limit=`
- `POST /v1/skills/custom`
- `PATCH /v1/skills/custom/:skillId`
- `DELETE /v1/skills/custom/:skillId`
- `POST /v1/skills/custom/:skillId/execute`
- `GET /v1/skills/custom/:skillId/runs?cursor=&limit=` (new, recommended)

Reason:
- Runtime logs are needed for debugging and trust in production.

## 4.5 Knowledge (new, required)

- `POST /v1/knowledge/files` (upload)
- `POST /v1/knowledge/index` (start indexing)
- `GET /v1/knowledge/jobs/:jobId` (index status)
- `GET /v1/knowledge/documents?cursor=&limit=`
- `DELETE /v1/knowledge/documents/:documentId`

Reason:
- Current frontend processes docs locally; production requires durable server-side storage/indexing and later retrieval.

## 5. Realtime Event Contract

All events should use:

```json
{
  "type": "task.updated",
  "threadId": "thread_1",
  "sentAt": "2026-02-19T09:00:00Z",
  "payload": {},
  "version": 1
}
```

Required event types:

- `bot.updated`
- `task.created`
- `task.created_from_message`
- `task.updated`
- `task.deleted`
- `agent.created`
- `agent.updated`
- `agent.skills.updated`
- `agent.deleted`
- `skill.custom.created`
- `skill.custom.updated`
- `skill.custom.deleted`

Reason:
- Frontend currently handles most task/agent events, but skill update/delete and bot update are needed for multi-device consistency.

## 6. Error Model

### 6.1 Response shape

```json
{
  "error": {
    "code": "TASK_CONFLICT",
    "message": "Task version conflict",
    "details": {
      "taskId": "task_1",
      "expectedVersion": 3,
      "actualVersion": 4
    },
    "requestId": "req_abc123"
  }
}
```

### 6.2 Minimum error codes

- `UNAUTHORIZED`
- `FORBIDDEN`
- `VALIDATION_ERROR`
- `NOT_FOUND`
- `CONFLICT`
- `RATE_LIMITED`
- `INTERNAL_ERROR`

Module-specific:

- `TASK_CONFLICT`
- `AGENT_SKILL_NOT_INSTALLED`
- `SKILL_EXECUTION_FAILED`
- `KNOWLEDGE_INDEXING_FAILED`

## 7. What Frontend Can Implement Next

1. Add `My Tasks` filter and pass query params to `GET /v1/tasks`.
2. Add optimistic rollback for failed writes (`tasks`, `bot-config`, `agents`).
3. Use `requestId` and `error.code` for better user-facing error handling.
4. Expose operation/run logs UI for skills and agents.
5. Add idempotency key middleware in `src/lib/api.ts`.

## 8. Rollout Plan

1. Phase 1: Complete current endpoints + error model + pagination.
2. Phase 2: Realtime event completion (`bot.updated`, `skill.custom.updated/deleted`).
3. Phase 3: Knowledge APIs and agent orchestration endpoint.
4. Phase 4: Batch task operations and runtime observability APIs.

