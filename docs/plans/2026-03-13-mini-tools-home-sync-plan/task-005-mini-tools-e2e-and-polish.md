# Task 005: 端到端回归与联调收尾

**depends-on**: [task-002-mini-tools-store-impl.md, task-003-home-bottom-dock-impl.md, task-004-miniapp-detail-style-impl.md]

## BDD Scenario

```gherkin
Scenario: 用户完成 Mini Tools 的搜索、添加、首页打开与删除完整链路
  Given 用户进入 Mini Tools 页面
  When 用户搜索并添加一个模板 app
  Then 首页底部应出现该 mini app 入口
  When 用户点击该入口
  Then 应进入与参考工程一致风格的详情页
  When 用户返回首页并删除该入口
  Then 首页与 Mini Tools 页面都应同步移除已添加状态
```

## 变更范围

- `e2e/` miniapp 相关脚本
- 必要的测试辅助与假数据
- 文案、动画、间距与安全区收尾

## 计划内容

- 新增或扩展 e2e 场景，覆盖完整业务链：
  - 进入商店
  - 搜索
  - 添加
  - 返回首页
  - 打开详情
  - 删除
- 清理中英文文案、testID、空态与错误态。
- 统一首页底部两套 Dock 的最终层级与交互手势。

## 验证

- 运行 Mini Tools 相关 Jest 测试。
- 运行 Mini Tools 相关 e2e。
- 手工验收首页、商店页、详情页三条主路径。

