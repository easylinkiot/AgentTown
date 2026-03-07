---

# NPC 功能开发任务说明

## 任务目标

在当前 App 中新增 **NPC 列表、NPC 聊天页、NPC 创建页、NPC 配置页** 四部分功能，并保持整体 UI 风格与现有 App 一致。

本次任务仅实现以下内容：

1. 首页展示 NPC 列表数据
2. 点击 NPC 进入独立聊天页
3. Quick Actions 中新增 `Create NPC` 入口
4. 新增 NPC 创建页
5. 创建成功后进入 NPC 配置页
6. 配置页实现技能绑定与展示、解绑
7. 配置页展示知识库多选 UI

---

# 一、实现范围

## 必须完成

* 首页请求并展示 NPC 列表
* NPC 列表点击跳转 `npc-chat`
* `npc-chat` 复用 `ai-chat` 逻辑，但移除 draw 相关内容
* Quick Actions 新增 `Create NPC` 按钮
* 新增 `npc-create` 页面并完成创建流程
* 新增 `npc-config` 页面
* `npc-config` 页面请求技能目录与知识库列表
* `npc-config` 页面实现技能绑定、绑定结果展示、解绑
* `npc-config` 页面实现知识库多选 UI

## 本次先不做

* NPC 编辑逻辑
* 知识库真正绑定 / 解绑接口逻辑（如果当前没有明确接口，只做 UI 和数据展示入口）
* draw 功能在 `npc-chat` 中的任何 UI 和业务逻辑
* NPC 删除功能
* NPC 列表搜索 / 筛选 / 排序功能

## 需要预留

* `npc-chat` 右上角编辑按钮
* `npc-config` 页面未来扩展知识库绑定逻辑
* NPC 配置页后续增加更多配置模块的能力

---

# 二、接口说明

## 1. 获取 NPC 列表

```http
GET http://localhost:8080/v2/npc
```

---

## 2. 创建 NPC

```http
POST http://localhost:8080/v2/npc
```

请求体：

```json
{
  "model_name": "gpt-4.1-mini",
  "name": "",
  "system_prompt": "You are a helpful demo npc."
}
```

字段规则：

* `model_name`：默认值固定为 `"gpt-4.1-mini"`
* `name`：必填
* `system_prompt`：默认值为 `"You are a helpful demo npc."`

---

## 3. 获取技能目录

```http
GET http://localhost:8080/v2/skills/catalog
```

---

## 4. 获取知识库列表

```http
GET http://localhost:8080/v2/knowledge
```

---

## 5. 绑定技能

```http
POST http://localhost:8080/v2/npc/{npcId}/skills/{skillId}
```

请求体：

```json
{
  "skill_scope": "system"
}
```

---

## 6. 获取 NPC 详情

```http
GET http://localhost:8080/v2/npc/{npcId}
```

返回结果中会包含：

```json
{
  "skill_bindings": []
}
```

---

## 7. 解绑技能

```http
DELETE http://localhost:8080/v2/npc/{npcId}/skills/{bindingId}
```

说明：

* `bindingId` 来自 `GET /v2/npc/{npcId}` 返回的 `skill_bindings[].id`

---

# 三、路由新增要求

需要新增以下路由：

```text
/npc-chat/:npcId
/npc-create
/npc-config/:npcId
```

说明：

* `npc-chat`：NPC 聊天页
* `npc-create`：创建 NPC 页面
* `npc-config`：NPC 配置页

---

# 四、首页列表改造

## 4.1 首页新增 NPC 数据源

在首页列表中新增 NPC 数据请求：

```http
GET /v2/npc
```

要求：

* 请求成功后，将 NPC 数据合并到首页现有展示区域
* NPC 列表项风格与当前列表风格尽量保持一致
* 不要破坏现有列表逻辑

---

## 4.2 NPC 列表项 UI 规则

由于 NPC 没有头像，使用默认通用头像。

每个 NPC 列表项需要展示：

* 默认头像
* `name`
* `system_prompt`

展示规则：

* 头像右上角显示 `name`
* 头像右下角显示 `system_prompt`

如果当前列表组件不支持这种角标布局，则允许在视觉上做等价实现，但必须保留以下信息层级：

1. 主信息：`name`
2. 次信息：`system_prompt`

---

## 4.3 点击 NPC 列表项行为

点击 NPC 列表项后，跳转到：

```text
/npc-chat/:npcId
```

其中 `npcId` 使用当前 NPC 数据的 id。

---

# 五、npc-chat 页面要求

## 5.1 页面来源

`npc-chat` 页面整体基于现有 `ai-chat` 页面复制实现。

要求：

* 优先复用现有 `ai-chat` 的页面结构、消息流、输入框、发送逻辑、滚动逻辑、状态处理逻辑
* 非必要不要重写整套聊天页面

---

## 5.2 必须删除的内容

在 `npc-chat` 页面中，移除所有 draw 相关内容，包括但不限于：

* draw 按钮
* draw 面板
* draw 参数
* draw 请求逻辑
* draw 状态管理
* draw 结果展示区域
* 任何与 draw 强相关的分支逻辑

要求：

* 删除后不能影响普通聊天能力
* 删除后页面结构仍然完整

---

## 5.3 页面头部要求

`npc-chat` 页右上角增加一个按钮：

```text
Edit
```

当前要求：

* 先只显示按钮 UI
* 点击事件可以先留空，或者跳转预留
* 不实现实际编辑功能

---

# 六、Quick Actions 改造

## 6.1 新增按钮

在首页 `Quick Actions` 模态框中新增一个按钮：

```text
Create NPC
```

## 6.2 点击行为

点击后跳转到：

```text
/npc-create
```

---

# 七、npc-create 页面要求

## 7.1 页面用途

该页面用于创建 NPC。

---

## 7.2 表单字段

页面需要包含以下 3 个字段：

### 1. Name

* 输入框
* 必填
* 初始值为空

### 2. Model Name

* 显示 `"gpt-4.1-mini"`
* 默认填充
* 只读，不允许修改

### 3. System Prompt

* 多行输入框
* 默认值为：

```text
You are a helpful demo npc.
```

* 允许修改

---

## 7.3 UI 设计要求

整体 UI 必须符合当前 App 风格。

建议结构：

* 顶部标题：Create NPC
* 中间为表单卡片
* 底部固定主按钮：`Submit`

要求：

* 表单间距、圆角、按钮样式与当前 App 一致
* 输入体验与现有表单页面一致
* 不要引入与当前设计系统冲突的新样式体系

---

## 7.4 提交按钮状态规则

只有以下条件全部满足时，`Submit` 按钮才可点击：

* `name` 非空
* `model_name` 非空
* `system_prompt` 非空

否则按钮禁用。

---

## 7.5 提交逻辑

点击 `Submit` 后：

调用：

```http
POST /v2/npc
```

请求体：

```json
{
  "model_name": "gpt-4.1-mini",
  "name": "<用户输入内容>",
  "system_prompt": "<当前输入内容>"
}
```

---

## 7.6 创建成功后的行为

创建成功后：

1. 从接口响应中拿到新建 NPC 的 `id`
2. 立即跳转到：

```text
/npc-config/:npcId
```

---

# 八、npc-config 页面要求

## 8.1 页面用途

该页面用于 NPC 创建后的配置管理。

当前只实现以下两个模块：

1. 技能绑定
2. 知识库多选 UI

---

## 8.2 页面初始化请求

页面进入后，默认并行请求：

```http
GET /v2/skills/catalog
GET /v2/knowledge
```

此外，建议同时请求：

```http
GET /v2/npc/{npcId}
```

原因：

* 用于获取当前 NPC 基础信息
* 用于获取 `skill_bindings`
* 方便页面首次展示已绑定内容

如果当前实现中想分步请求，也允许，但最终页面必须能展示最新绑定结果。

---

# 九、技能绑定模块

## 9.1 数据来源

技能列表来自：

```http
GET /v2/skills/catalog
```

---

## 9.2 UI 形式

实现一个“多数据多选”的技能选择模块。

要求：

* 可展示多个技能项
* 支持一次选择多个技能
* 支持触发绑定动作
* 视觉风格与当前 App 的多选列表 / 标签选择组件一致

建议实现形式可任选其一：

* Checkbox 列表
* Tag 多选
* 可选择卡片列表

但必须满足“多选”需求。

---

## 9.3 技能绑定逻辑

当用户确认绑定时，对每个被选中的技能分别调用一次：

```http
POST /v2/npc/{npcId}/skills/{skillId}
```

请求体固定为：

```json
{
  "skill_scope": "system"
}
```

要求：

* 多个技能时，发起多次请求
* 可以串行，也可以并行
* 但必须保证最终绑定结果正确

---

## 9.4 绑定成功后的刷新逻辑

所有绑定请求成功后，重新请求：

```http
GET /v2/npc/{npcId}
```

从返回结果中读取：

```json
skill_bindings
```

并刷新页面中的“已绑定技能”区域。

---

## 9.5 已绑定技能展示

将 `GET /v2/npc/{npcId}` 返回的 `skill_bindings` 渲染为列表。

每个 item 至少显示：

* `skill_name`
* `skill_scope`

展示格式：

```text
{skill_name} ({skill_scope})
```

示例：

```text
Professional Reply (system)
```

---

## 9.6 每个已绑定技能项的操作

每个已绑定技能项右侧必须有一个按钮：

```text
Unbind
```

---

## 9.7 解绑逻辑

点击 `Unbind` 后调用：

```http
DELETE /v2/npc/{npcId}/skills/{bindingId}
```

其中：

* `bindingId = skill_bindings[].id`

解绑成功后重新请求：

```http
GET /v2/npc/{npcId}
```

然后刷新“已绑定技能”列表。

---

# 十、知识库绑定模块

## 10.1 数据来源

知识库列表来自：

```http
GET /v2/knowledge
```

---

## 10.2 当前实现范围

当前先实现：

* 知识库列表展示
* 多选 UI
* 已选状态维护

暂时不要求实现真实绑定接口，除非项目中已有明确知识库绑定 API。

---

## 10.3 UI 要求

知识库模块的 UI 风格与技能绑定模块保持一致。

要求：

* 支持多选
* 支持展示已选择状态
* 支持后续扩展真正绑定逻辑
* 组件结构不要写死，便于未来接入接口

---

# 十一、状态处理要求

以下页面都要补齐基础状态：

## 首页 NPC 列表

* loading
* empty
* error

## npc-create 页面

* submitting
* submit disabled
* submit error

## npc-config 页面

* loading
* bind skill submitting
* unbind skill submitting
* empty skill list
* empty knowledge list

要求：

* 状态表现尽量与现有 App 一致
* 避免重复点击导致重复请求
* 失败后给出基础提示

---

# 十二、复用原则

为了降低改动成本，优先按以下原则实现：

## 必须优先复用

* 现有列表 item 样式
* 现有聊天页结构
* 现有表单组件
* 现有按钮组件
* 现有弹窗 / Toast / Loading 组件
* 现有路由组织方式
* 现有 API 请求封装

## 尽量不要做

* 大规模重构首页
* 新建一套独立设计系统
* 重写聊天底层逻辑
* 改动现有 ai-chat 核心行为

---

# 十三、建议实现顺序

Codex 必须按以下顺序执行，避免上下文混乱：

## Step 1：首页接入 NPC 列表

* 新增 `GET /v2/npc`
* 完成首页 NPC 列表 UI
* 完成点击跳转 `npc-chat`

## Step 2：新增 `npc-chat` 页面

* 从 `ai-chat` 复制
* 删除 draw 相关逻辑
* 增加右上角 `Edit` 按钮

## Step 3：Quick Actions 新增入口

* 新增 `Create NPC` 按钮
* 跳转到 `npc-create`

## Step 4：新增 `npc-create` 页面

* 完成表单 UI
* 接入 `POST /v2/npc`
* 创建成功跳转 `npc-config/:npcId`

## Step 5：新增 `npc-config` 页面基础结构

* 页面初始化请求：

  * `GET /v2/skills/catalog`
  * `GET /v2/knowledge`
  * 建议补充 `GET /v2/npc/{npcId}`

## Step 6：实现技能绑定模块

* 技能列表多选 UI
* 多次调用绑定接口
* 刷新 NPC 详情
* 渲染已绑定技能
* 实现解绑

## Step 7：实现知识库多选 UI

* 展示知识库列表
* 支持多选和状态维护
* 预留后续绑定逻辑

---

# 十四、关键实现约束

## 1. 不要擅自修改接口字段名

必须严格使用以下字段名：

* `model_name`
* `name`
* `system_prompt`
* `skill_scope`
* `skill_bindings`
* `skill_name`

---

## 2. `npcId` 必须来自真实创建结果

不能写死。

示例中的：

```text
d6lc7hougsms7393jul0
```

只是示例 id，实际实现必须从接口返回结果读取。

---

## 3. `bindingId` 必须来自 `skill_bindings[].id`

不能使用 `skillId` 代替解绑 id。

---

## 4. 知识库模块先不要臆造绑定接口

如果文档中没有明确知识库绑定接口，本次只完成 UI 和选择态，不要自行假设接口结构。

---

## 5. 保持现有 App 风格一致

包括但不限于：

* 颜色
* 圆角
* 间距
* 字体层级
* 按钮风格
* 卡片风格
* 页面留白
* 空状态和加载状态表现

---

# 十五、验收标准

满足以下条件视为完成：

## 首页

* 能成功请求并显示 NPC 列表
* 列表项展示默认头像、name、system_prompt
* 点击后能进入 `npc-chat`

## npc-chat
* 禁止引用其他聊天页面
* 页面可正常打开
* 普通聊天 UI 正常
* draw 相关 UI 和逻辑已移除
* 右上角有 `Edit` 按钮

## Quick Actions

* 有 `Create NPC` 按钮
* 点击后能进入创建页

## npc-create

* 表单字段完整
* 默认值正确
* `name` 必填
* 提交成功后跳转到 `npc-config/:npcId`

## npc-config

* 页面初始化能请求技能目录和知识库列表
* 技能支持多选
* 技能绑定成功后能显示已绑定技能
* 已绑定技能能解绑
* 知识库模块能展示并多选

---

# 十六、给 Codex 的执行要求

请严格按以下原则执行：

1. 优先阅读现有 `ai-chat`、首页列表、Quick Actions、表单页的实现方式
2. 优先复用现有组件和请求封装
3. 按“建议实现顺序”逐步完成，不要一次性大范围改造
4. 不要自行扩展需求
5. 不要添加与本任务无关的优化
6. 如果接口返回结构与预期不一致，以项目中的 API 文档为准
7. API 文档参考：

```text
/Users/zhangxiaowei/GitHub/agenttown-api/docs/v2-api.md
```

---

# 十七、补充说明

## 关于知识库绑定

当前需求只明确说明：

* 配置页要请求 `GET /v2/knowledge`
* 配置页要有“绑定知识库 UI”
* 该模块是一个多数据多选功能模块

但没有提供明确的知识库绑定 / 解绑接口，因此本次先完成：

* 列表展示
* 多选状态
* UI 结构预留

---

## 关于编辑按钮

`npc-chat` 右上角的编辑按钮当前只要求显示，不要求实现实际编辑页面或提交逻辑。

---

## 关于 draw

`npc-chat` 页面必须彻底移除 draw 相关 UI 和逻辑，但不能影响正常聊天功能。

---