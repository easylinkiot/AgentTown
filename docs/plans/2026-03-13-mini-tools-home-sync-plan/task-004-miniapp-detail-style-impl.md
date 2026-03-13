# Task 004: Mini App 详情展示实现

**depends-on**: [task-004-miniapp-detail-style-test.md]

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
- `src/features/miniapps/model.ts`

## 计划内容

- 详情页改造重点不是照搬 Web 交互，而是对齐“模板化产品页”感受：
  - 更强的 hero/标题区
  - 更清晰的状态区和操作区
  - 模板卡片的分块布局
- 扩展 RN `MiniAppRenderer`：
  - 对现有 `news_feed`、`flashcard`、`price_tracker` 做更贴近参考项目的视觉升级
  - 对 `tpl_code`、`tpl_office`、`tpl_checkin`、`tpl_data` 至少映射到可读的 dashboard/generic layout
- 若后端 preview schema 不足，先补 schema，再补 renderer，不允许在前端用大量脆弱字符串判断硬拼页面。

## 验证

- 详情页测试通过。
- 从首页底部打开 app 后，展示效果与商店页、安装状态一致。

