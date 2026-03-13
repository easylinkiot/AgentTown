# Task 002: Mini Tools 商店页交互测试

**depends-on**: [task-001-mini-tools-catalog-impl.md]

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
- `src/__tests__/` 或 `src/features/miniapps/__tests__/`
- `e2e/miniapps-default-presets.e2e.js` 或新增 e2e 用例

## 计划内容

- 为商店页增加组件级测试，覆盖：
  - 搜索输入过滤
  - 模板卡片的“添加/已添加”状态切换
  - 已安装模板重复点击不重复创建
- 补一条 e2e，验证从商店页添加后首页底部可见。

## 验证

- 运行商店页相关 Jest 测试。
- 运行 Mini Apps e2e 场景。

