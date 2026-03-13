# Task 001: 对齐 Mini Tools 目录与模板契约实现

**depends-on**: [task-001-mini-tools-catalog-test.md]

## BDD Scenario

```gherkin
Scenario: Mini Tools 商店读取统一模板目录并标记已添加状态
  Given 后端返回 mini tool 模板列表与用户已安装 mini app 列表
  When 前端构建 Mini Tools 页面目录数据
  Then 页面中的每个模板项都应具备稳定 id、名称、描述、图标和模板类型
  And 已安装项应被正确标记为已添加
  And 模板目录应覆盖当前 AgentTown 已有 preset、template 与前端内置种子入口
```

## 变更范围

- `src/features/miniapps/`：新增 catalog/model 层
- `src/state/agenttown-context.tsx`：暴露统一 catalog 数据与安装动作
- `src/lib/api.ts`：必要时补充模板查询或按模板安装接口
- `agenttown-api/internal/http/handlers.go`
- `agenttown-api/internal/model/types.go`

## 计划内容

- 统一定义 `MiniToolCatalogItem`：
  - `id`
  - `sourceType`（preset/template/seed）
  - `title`
  - `description`
  - `icon`
  - `accentColor`
  - `searchTokens`
  - `installAction`
  - `matchedInstalledAppId`
- 后端补齐模板目录元数据，至少让前端不用硬编码中文/英文展示文案。
- 若模板可直接安装，扩展后端安装语义：
  - 要么复用 preset install
  - 要么新增 template install
  - 但前端最终只感知统一“添加”动作

## 验证

- 前端 catalog builder 测试通过。
- 后端模板接口测试通过。
- 手工检查 `/v1/miniapps/templates` 返回内容是否足以驱动页面。

