# Mini Tools 与首页底部入口同步改造计划

## 目标

在 `agenttown-app` 中参考 `mybot-world` 的 Mini Tools 交互与展示效果，完成以下改造：

1. 新增与 `mybot-world` 风格一致的 `Mini Tools` 页面，支持搜索、添加。
2. 将当前 AgentTown 代码里已有的 mini tools 模板 app 在当前 App 中成体系展示，并保证前后端数据匹配。
3. 在首页底部新增与 `mybot-world` 一致的入口条，支持展示已添加的 mini app，并支持删除。
4. 点击首页底部已添加的 mini app 后，详情展示风格对齐 `mybot-world`。

## 范围

- 参考来源：
  - `mybot-world/components/MiniAppStoreModal.tsx`
  - `mybot-world/components/MiniAppWidget.tsx`
  - `mybot-world/components/MiniAppRenderer.tsx`
  - `mybot-world/App.tsx`
- 目标工程：
  - `agenttown-app/app/miniapps.tsx`
  - `agenttown-app/app/index.tsx`
  - `agenttown-app/app/miniapp/[id].tsx`
  - `agenttown-app/src/components/MiniAppDock.tsx`
  - `agenttown-app/src/features/miniapps/*`
  - `agenttown-app/src/state/agenttown-context.tsx`
  - `agenttown-app/src/lib/api.ts`
  - `agenttown-api/internal/http/handlers.go`
  - `agenttown-api/internal/model/types.go`

## 现状结论

- `agenttown-app` 已有 Mini App 基础能力：
  - `/miniapps` 页面存在，但当前是列表页，不是 `mybot-world` 风格的搜索/添加面板。
  - 首页已有 `MiniAppDock`，但它位于首页地图区内部，不是底部常驻快捷入口条。
  - 已有 `generateMiniApp`、`installMiniApp`、`installPresetMiniApp`、`deleteMiniApp` 等 API 与状态管理。
  - 已有 `MiniAppRenderer`，但当前只覆盖 `news_feed`、`flashcard`、`price_tracker`、`dashboard`、`generic` 五类 RN 海报视图。
- 后端模板能力不足：
  - `/v1/miniapps/templates` 目前只返回 4 个模板：`tpl_code`、`tpl_office`、`tpl_checkin`、`tpl_data`。
  - 预置安装接口目前只支持 3 个 preset：`news`、`price`、`words`。
- `mybot-world` 的效果更接近“商店 + 底部 Dock + 卡片化详情”的一体化体验：
  - 商店页支持搜索与快速加号安装。
  - 首页底部条既能展示固定入口，也能展示用户已添加 app，且支持删除。
  - mini app 详情更像模板化产品页，而不是单纯 JSON/海报块渲染。

## 设计决策

### 决策 1：不直接照搬 Web 组件，保留 RN 路由与数据流

原因：

- `mybot-world` 是 Web/Tailwind/Lucide 体系，`agenttown-app` 是 React Native + Expo Router。
- 直接抄 UI 代码不可维护，也无法和现有 `useAgentTown`、`MiniAppRenderer`、导航结构复用。

结论：

- 复刻“信息架构、交互节奏、视觉层级”，不逐行复刻实现。

### 决策 2：Mini Tools 商店与首页底部 Dock 使用同一份可持久化 catalog + install state

原因：

- 用户要求“搜索、添加、首页可见、可删除、详情可打开”是同一条业务链。
- 现在首页和 `/miniapps` 页面存在两套入口表达，继续分裂会导致状态不同步。

结论：

- 新增统一的 `mini tool catalog view model`：
  - catalog item：可搜索、可显示图标/文案/模板类型
  - installed item：可在首页底部展示，可删除，可跳转详情

### 决策 3：模板范围以 AgentTown 当前已有能力为基线扩展，而不是把 mybot-world 的全部实验型模板一次搬完

原因：

- `mybot-world` 的 `FashionDesignerView` 等页面依赖 Web DOM、图片上传、Gemini 图片能力，不等于 AgentTown 当前后端已有稳定契约。
- 用户要求“将现在代码中的已经有的 mini tools 中所有模板 app 复刻出来”，更稳妥的解释是：先把 AgentTown 当前代码和后端可表达的模板全部纳入统一入口，再补足与 `mybot-world` 同风格的展示。

结论：

- 第一阶段模板范围：
  - 已有 preset：`news`、`price`、`words`
  - 已有后端模板：`tpl_code`、`tpl_office`、`tpl_checkin`、`tpl_data`
  - 已有前端 examples/prompt seed：`brief`、`chat-digest`、`follow-up`
- 若需要完整对齐 `mybot-world` 的更多特化模板，后续再追加新的 preview schema 和 runtime。

## 约束与风险

- 首页底部现在已有团队成员 Dock，新增 Mini Tools 入口条时必须处理与现有底部 UI 的层级冲突和安全区占位。
- `MiniAppRenderer` 当前只支持少量 UI 类型；若新模板没有统一 preview schema，会导致“能加不能像参考效果展示”。
- `/v1/miniapps/templates` 与 preset install 能力当前不对等，需要统一命名和安装入口，否则前端很难做“模板商店”。

## 验收标准

- `/miniapps` 变成 `Mini Tools` 商店页，支持搜索、添加、查看已添加状态。
- 首页底部出现与 `mybot-world` 一致的信息结构：
  - 固定入口
  - 已添加 mini app
  - 加号入口
  - 删除交互
- 从首页底部点击已添加 mini app，可进入详情并看到与 `mybot-world` 接近的卡片化/模板化内容展示。
- 安装、卸载、删除操作前后端一致，首页与商店页状态实时同步。

## Execution Plan

- [Task 001: 对齐 Mini Tools 目录与模板契约测试](./task-001-mini-tools-catalog-test.md)
- [Task 001: 对齐 Mini Tools 目录与模板契约实现](./task-001-mini-tools-catalog-impl.md)
- [Task 002: Mini Tools 商店页交互测试](./task-002-mini-tools-store-test.md)
- [Task 002: Mini Tools 商店页交互实现](./task-002-mini-tools-store-impl.md)
- [Task 003: 首页底部 Dock 同步测试](./task-003-home-bottom-dock-test.md)
- [Task 003: 首页底部 Dock 同步实现](./task-003-home-bottom-dock-impl.md)
- [Task 004: Mini App 详情展示测试](./task-004-miniapp-detail-style-test.md)
- [Task 004: Mini App 详情展示实现](./task-004-miniapp-detail-style-impl.md)
- [Task 005: 端到端回归与联调收尾](./task-005-mini-tools-e2e-and-polish.md)

