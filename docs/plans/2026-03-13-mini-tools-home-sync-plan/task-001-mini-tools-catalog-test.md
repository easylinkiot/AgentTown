# Task 001: 对齐 Mini Tools 目录与模板契约测试

**depends-on**: none

## BDD Scenario

```gherkin
Scenario: Mini Tools 商店读取统一模板目录并标记已添加状态
  Given 后端返回 mini tool 模板列表与用户已安装 mini app 列表
  When 前端构建 Mini Tools 页面目录数据
  Then 页面中的每个模板项都应具备稳定 id、名称、描述、图标和模板类型
  And 已安装项应被正确标记为已添加
  And 模板目录应覆盖当前 AgentTown 已有 preset、template 与前端内置种子入口
```

## 变更范围

- 新增或补充 catalog 组装层的测试，优先放在：
  - `src/features/miniapps/__tests__/`
  - `src/state/__tests__/`
  - 后端 `internal/http/handlers_test.go`

## 计划内容

- 为前端新增 `mini tools catalog builder` 测试，验证：
  - preset/template/seed 三类来源被合并。
  - 已安装状态能从 `miniApps` 映射出来。
  - 搜索字段支持名称、描述、分类关键词。
- 为后端新增模板接口测试，验证：
  - `/v1/miniapps/templates` 返回结构满足前端商店页所需字段。
  - 模板项 id 稳定且可映射到安装动作。

## 验证

- 运行前端 miniapp 相关单测。
- 运行后端 miniapp handler 单测。

