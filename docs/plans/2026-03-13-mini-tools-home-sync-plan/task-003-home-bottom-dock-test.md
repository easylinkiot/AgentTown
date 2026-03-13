# Task 003: 首页底部 Dock 同步测试

**depends-on**: [task-001-mini-tools-catalog-impl.md]

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
- 首页测试文件
- 必要时新增 e2e

## 计划内容

- 为首页底部入口条补测试，覆盖：
  - 已安装 app 的渲染
  - 删除交互
  - 状态同步到商店页
  - 空状态下仍保留加号入口

## 验证

- 首页测试通过。
- e2e 验证首页与商店页状态联动。

