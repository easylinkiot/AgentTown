# Task 002: Mini Tools 商店页交互实现

**depends-on**: [task-002-mini-tools-store-test.md]

## BDD Scenario

```gherkin
Scenario: 用户在 Mini Tools 页面搜索并添加模板 app
  Given 用户进入 Mini Tools 页面
  And 页面展示统一模板目录
  When 用户输入关键词搜索
  Then 页面应只显示匹配项
  When 用户点击某个模板卡片上的添加按钮
  Then 该模板应变成已添加状态
  And 首页底部 Dock 数据应在同一状态源中立即更新
```

## 变更范围

- `app/miniapps.tsx`
- `src/features/miniapps/`
- `src/components/`

## 计划内容

- 将 `/miniapps` 从“列表页”改造成“Mini Tools 商店页”：
  - 顶部标题与关闭/返回
  - 搜索输入框
  - 模板网格
  - 卡片右下角添加状态按钮
  - 空搜索结果态
- 样式方向对齐 `mybot-world/MiniAppStoreModal.tsx`：
  - 圆角面板
  - 深色磨砂背景
  - 四列或自适应网格
  - 小图标 + 小字标题 + 简短描述
- 保留 RN 导航结构，不引入 Web modal 嵌套路由复杂度。

## 验证

- 商店页交互测试通过。
- 手工验证中英文文案、搜索、添加状态。

