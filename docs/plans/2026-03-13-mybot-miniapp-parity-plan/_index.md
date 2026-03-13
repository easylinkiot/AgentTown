# MyBot Mini App Parity Plan

## Goal

将 `mybot-world` 的 Mini Tool / Mini App 系统作为唯一 source of truth，完整映射到 `agenttown-app`。目标不是“相似 UI”，而是用户感知层面的交互、功能、样式、资源、按钮、模板清单都一致。

本计划中的“一致”定义为以下内容都必须对齐：

1. 模板类型一致
2. 商店 / 首页底部 widget / 创建入口 / 删除交互一致
3. icon、颜色、按钮文案、默认资源、模板清单、快捷动作一致
4. 单个 mini app 的渲染结构、状态变化、按钮语义、反馈节奏一致
5. 前后端 runtime schema、生成结果结构、运行接口行为一致

## Parity Standard

`mybot-world` mini tool 体系中的以下元素都按“硬性验收项”处理：

- 首页 mini tool widget 的布局、层级、滚动方式、删除方式
- `Create Mini App` 主按钮的文案、结构、交互结果
- `QUICK_ACTIONS` 的数量、顺序、图标、颜色、文案、行为
- 已安装 mini app 卡片的样式、删除入口、打开方式
- `MiniAppStoreModal` 的标题、搜索、网格排布、加号/勾号按钮、空态
- `AVAILABLE_APPS` 的模板清单、图标、颜色、说明文案
- `MiniAppRenderer` 中每一类模板的区块顺序、按钮语义、资源与反馈
- 打开、添加、删除、隐藏 quick action、切换 task 区的状态行为

只要以上任一项仍是“近似版”或“RN 风格替代版”，都不算完成。

## Source Of Truth

- `mybot-world/types.ts`
- `mybot-world/components/MiniAppStoreModal.tsx`
- `mybot-world/components/MiniAppWidget.tsx`
- `mybot-world/components/MiniAppRenderer.tsx`

## Current Gap Summary

### 1. Data Contract Gap

`mybot-world` 的 mini app 以 `type + content` 为核心，前端 renderer 直接消费强类型内容。

`agenttown-app` 当前仍然是：

- `preview`
- `category`
- `lastRunOutput`
- 泛化后的 `view model`

这会导致：

- renderer 只能“拟态”而不是“同构”
- runtime 输出只能归一化成近似结构
- 新模板要不断在 parser 层做补丁

### 2. Interaction Gap

`mybot-world` 的体验是一个完整闭环：

- Store modal
- Home widget
- Quick actions
- Create Mini App CTA
- Delete confirm overlay
- Task area toggle
- App overlay renderer

`agenttown-app` 当前拆成：

- 独立页面式 store
- 底部 dock
- 详情页式 renderer

结构和交互层级都与源实现不一致。

### 3. Template Behavior Gap

虽然目前已经补了几类模板，但仍然和 `mybot-world` 有明显差异：

- `flashcard` 缺少翻转卡片、记忆曲线、复习节奏
- `news_feed` 缺少热度、浏览量、卡片节奏
- `price_tracker` 缺少分类 tab、价格曲线、节省汇总
- `generative_app` 缺少 full-width widget 布局与本地交互状态
- `fashion_designer` 缺少与源实现一致的双图产出和生产方案闭环
- `car_caring` 缺少更游戏化的状态反馈

### 4. Catalog Gap

`mybot-world` 里实际存在两套入口：

- Store 里的 `AVAILABLE_APPS`
- Home widget 里的 `QUICK_ACTIONS`

`agenttown-app` 当前只有 catalog 合并层，没有把“商店模板”和“快捷创建动作”拆成独立 source of truth。

### 5. Resource And Copy Gap

当前 `agenttown-app` 中的 mini tool 资源并没有严格继承 `mybot-world`：

- 图标体系不一致
- accent color 不一致
- 按钮文案不一致
- 模板描述文案不一致
- 模板数量与排序不一致
- 默认演示内容不一致

这会让整体体验即使“功能能用”，也仍然不是同一套 mini tool 系统。

## Parity Scope

本轮按“严格 parity”定义范围：

### 必须对齐的模板类型

- `news_feed`
- `flashcard`
- `price_tracker`
- `dashboard`
- `task_list`
- `generative_app`
- `fashion_designer`
- `car_caring`

### 必须对齐的快捷动作

- `fashion`
- `news`
- `price`
- `words`
- `food`
- `ai_terms`
- `toggle_tasks`

### 必须对齐的入口形态

- Mini Tools store modal
- 首页底部 widget
- Create Mini App 主入口
- 删除确认浮层
- Mini app overlay renderer

### 必须对齐的资源元素

- store 中每个模板的 icon、color、name、desc
- widget 中每个 quick action 的 icon、color、label、order
- 各模板默认示例内容、默认文案、按钮文字
- renderer 中展示型资源与状态标签

## Execution Plan

### Phase 0. Lock The Contract

目标：停止继续在 `preview` 上打补丁，建立与 `mybot-world` 同构的数据契约。

任务：

- 在 `agenttown-app` 和 `agenttown-api` 中新增 `mini app parity schema`
- 将前端核心类型从“以 `preview` 为主”切换为“以 `type + content` 为主”
- 保留旧字段兼容，但新 renderer 不再以 `preview` 作为主输入
- 为 `AVAILABLE_APPS` 和 `QUICK_ACTIONS` 抽出共享 catalog 定义

交付物：

- 统一模板类型枚举
- 统一 content schema
- 统一 quick action schema
- 向后兼容映射表

验收：

- 任意 mini app 都可以只靠 `type + content` 完整渲染
- `preview` 删除后，parity renderer 仍能运行

### Phase 1. Rebuild Frontend Shell To Match MyBot

目标：先把整体壳子做成和 `mybot-world` 一样的交互层级。

任务：

- 新增 `MiniAppStoreModal` React Native 版本
- 新增 `MiniAppWidget` React Native 版本
- 新增 `MiniAppOverlayRenderer` React Native 版本
- 首页底部 dock 改为 widget 形态，不再只是 chip 列表
- Mini Tools 页面保留路由入口，但默认呈现 modal-style 体验
- 新增删除确认浮层，而不是系统原生 `Alert`
- 对齐 `Create Mini App` 主卡片的文案、结构、箭头按钮和入口行为
- 对齐 widget 横向滚动区的 spacing、卡片尺寸、按钮分布
- 对齐 store modal 的 header、search、4 列网格与 add/check 按钮位置

验收：

- 首页底部入口、卡片数量、按钮层级、删除方式、打开方式与 `mybot-world` 一致
- 点击 mini app 后以 overlay 打开，不走当前详情页主路径
- 首页 widget 与 store modal 的视觉和操作路径可逐项对照 `mybot-world` 通过

### Phase 2. Restore Template-Exact Renderers

目标：逐个模板按 `mybot-world` 结构复刻，而不是继续抽象化。

任务：

- `news_feed`: 卡片、热度条、浏览量、tag、时间信息
- `flashcard`: 正反面翻转、掌握度、连续打卡、下次复习、sparkline
- `price_tracker`: 分类 tab、商品卡、价格曲线、潜在节省卡
- `task_list`: 任务完成态、优先级 badge、责任人信息
- `generative_app`: 2 列 + full-width widget 混排、toggle/button/chart/list/text 行为
- `fashion_designer`: 需求输入、参考图、双图结果、生产方案
- `car_caring`: 车况面板、操作反馈、状态变化
- `dashboard`: 对齐 `mybot-world` 中的 metric/card 节奏
- 将默认文案、默认示例数据、按钮标题、状态标签同步为 `mybot-world` 版本

验收：

- 每个模板的字段、区块顺序、按钮文案、加载态、空态、默认资源和 `mybot-world` 一致

### Phase 3. Rebuild Runtime Actions

目标：对齐“点了之后发生什么”。

任务：

- 后端 `generateMiniApp` 支持 `mybot-world` 风格的 quick create 输入
- 后端 `runMiniApp` 按模板类型返回精确 content patch，而不是松散 output
- `fashion_designer` 增加双图 + 生产方案返回结构
- `generative_app` 支持 button/toggle/list/chart/text 等 widget state 更新
- `car_caring` 支持 action-driven stats 更新
- `task_list` 支持本地交互与服务端状态同步策略

验收：

- 每种模板点击操作后，状态更新结果与 `mybot-world` 保持同类行为

### Phase 4. Rebuild Store And Quick-Create Logic

目标：让 catalog、商店、快捷动作都来自同一个真实配置源。

任务：

- 拆分 `store apps` 和 `quick actions`
- 建立 catalog registry，支持：
  - store 展示配置
  - quick action 展示配置
  - backend generation seed
  - renderer type binding
- `AVAILABLE_APPS` 完整迁移
- `QUICK_ACTIONS` 完整迁移
- 安装、移除、隐藏 quick action 的状态单独建模
- 将 `AVAILABLE_APPS` 的顺序、文案、icon、color 视为配置真值源
- 将 `QUICK_ACTIONS` 的顺序、文案、icon、color 视为配置真值源

验收：

- 商店和首页底部不再各自维护一套逻辑
- 隐藏 quick action、删除 installed app 的行为与源实现一致
- 市场模板和首页快捷动作的资源配置与 `mybot-world` 一项不差

### Phase 5. Compatibility Cleanup

目标：清理当前“近似复刻”代码，避免双轨逻辑长期并存。

任务：

- 下线或降级当前 `HomeMiniToolsDock`
- 下线当前近似版 `MiniAppRenderer`
- 将现有 `/miniapp/[id]` 页面改成 parity overlay 的承载路由或兼容入口
- 清理只为旧 preview model 服务的 parser

验收：

- mini app 只有一套主渲染路径
- 不再需要为相同模板维护两份 view model

### Phase 6. Verification

目标：用视觉和行为双重回归保证“真一致”。

任务：

- 为 catalog / quick action / schema parser 补单测
- 为 widget / store / overlay / delete confirm 补组件测试
- 为 8 类模板分别补渲染快照或结构断言
- 增加最少 1 条 e2e 主链路：
  - 打开首页 widget
  - 打开 store
  - 添加 app
  - 回到首页打开 app
  - 执行一次交互
  - 删除 app
- 增加 parity checklist，逐项核对：
  - 首页 widget
  - store modal
  - quick actions
  - installed cards
  - 8 类模板 renderer
  - 文案 / icon / color / order
- 输出一份 `mybot-world -> agenttown-app` 的差异清零清单

验收：

- parity 主路径具备自动化回归
- 人工 checklist 不存在剩余差异项

## Recommended Order

1. Phase 0 contract
2. Phase 1 shell
3. Phase 2 exact renderers
4. Phase 3 runtime actions
5. Phase 4 catalog and quick actions
6. Phase 5 cleanup
7. Phase 6 verification

## Key Risks

- `mybot-world` 是 web + Tailwind + lucide，`agenttown-app` 是 React Native；实现技术不同，但本轮要求的是用户感知上的同一套 mini tool 体验，不能以“平台差异”为理由保留交互差异
- `fashion_designer` 在 `mybot-world` 中直接依赖 Gemini SDK；迁移到 `agenttown-app` 后必须改成后端代理，否则端侧密钥和能力模型不成立
- `generative_app` 与 `car_caring` 当前后端 runtime 仍偏演示型，若要完全同构，需要把 widget/action patch 作为正式协议
- 现有已安装 mini apps 数据可能不满足新 schema，需要一次迁移或兼容兜底

## Definition Of Done

满足以下条件才算完成：

1. `agenttown-app` 中的首页 mini tool widget、Mini Tools 市场、Create Mini App、删除浮层与 `mybot-world` 一致
2. `AVAILABLE_APPS` 与 `QUICK_ACTIONS` 的数量、顺序、文案、icon、color、行为一致
3. 8 类模板的字段结构、展示资源、按钮语义、交互反馈一致
4. 前后端以统一 runtime schema 传递内容，不再依赖 preview 补丁
5. 自动化测试覆盖添加、打开、交互、删除主链路
6. 人工 parity checklist 全部通过，不留“后续再调样式”的尾项
