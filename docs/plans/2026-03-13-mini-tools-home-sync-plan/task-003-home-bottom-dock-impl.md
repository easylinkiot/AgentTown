# Task 003: 首页底部 Dock 同步实现

**depends-on**: [task-003-home-bottom-dock-test.md]

## BDD Scenario

```gherkin
Scenario: 首页底部入口展示已添加 mini app 且支持删除
  Given 用户已添加一个或多个 mini app
  When 用户回到首页
  Then 首页底部应展示固定入口、已添加 mini app 和添加入口
  When 用户删除某个已添加 mini app
  Then 该入口应从首页底部消失
  And Mini Tools 页面中的状态应同步变为未添加
```

## 变更范围

- `app/index.tsx`
- 可能新增 `src/components/HomeMiniToolsDock.tsx`
- `src/state/agenttown-context.tsx`

## 计划内容

- 在首页底部新增独立 `Mini Tools Dock`，不要继续塞在地图区内部。
- 对齐 `mybot-world/App.tsx` 底部条的信息结构：
  - 固定功能入口
  - 已添加 mini app chip
  - 加号入口
- 删除操作使用长按、浮层确认或小删除按钮，但最终行为必须同步调用现有卸载/删除能力。
- 与当前团队成员 Dock 重新分层：
  - 明确谁在最底层
  - 处理 safe area
  - 避免遮挡聊天列表和底部菜单

## 验证

- 首页底部 Dock 测试通过。
- 真机或模拟器手工确认滚动、点击、长按不互相冲突。

