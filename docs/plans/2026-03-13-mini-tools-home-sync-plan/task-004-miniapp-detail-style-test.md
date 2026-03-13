# Task 004: Mini App 详情展示测试

**depends-on**: [task-001-mini-tools-catalog-impl.md]

## BDD Scenario

```gherkin
Scenario: 用户从首页底部打开已添加 mini app 时看到参考工程风格的详情页
  Given 用户已经从 Mini Tools 添加了一个模板 app
  And 该 app 出现在首页底部
  When 用户点击该 app
  Then 应进入 mini app 详情页
  And 详情页应按模板类型展示卡片化内容
  And 展示风格应接近 mybot-world 中对应 mini app 的信息层级与节奏
```

## 变更范围

- `app/miniapp/[id].tsx`
- `src/features/miniapps/MiniAppRenderer.tsx`
- `src/features/miniapps/__tests__/model.test.ts`
- 视图测试文件

## 计划内容

- 为模板类型补充 view model / renderer 测试，确保不同模板走稳定渲染分支。
- 增加详情页 UI 测试，验证：
  - 顶部 hero/header
  - 模板卡片内容
  - 安装状态动作区
  - 从首页跳转后正确读取 app 数据

## 验证

- 详情页测试通过。
- 手工验证至少 3 类模板：情报/比价/单词。

