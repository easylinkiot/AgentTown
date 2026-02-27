# 流程演练报告（iOS E2E）

- 日期: 2026-02-27
- 作用域: AgentTown 前端 + agenttown-api 后端
- 约束: Detox 仅执行 iOS（Android 不纳入本流程）

## 场景
新增并验证一条最小主链路 E2E：
游客登录 -> 进入 MyBot -> 发送消息 `remind me 1 minute to drink water`

## 执行步骤（相对路径）
1. 进入前端目录: `cd AgentTown`
2. 环境自检: `npm run e2e:env:check:ios`
3. 冒烟执行: `npm run e2e:test:smoke`

## 结果
1. `e2e:env:check:ios`: PASS（仅 watchman 提示 WARN）
2. iOS 构建: PASS（xcodebuild 成功）
3. Detox 用例: FAIL

失败信息（摘要）：
- `Detox can't seem to connect to the test app(s)`
- `beforeAll` 中 `device.launchApp()` 超时（120s）

## 根因分析（当前）
1. 失败不在用例步骤本身，而在 Detox 与 iOS App 握手阶段。
2. 现象与历史日志一致：App 能被拉起，但连接会话未建立，导致测试在 `launchApp` 阶段超时。

## 已完成修正
1. Detox 配置收敛为 iOS-only（移除 Android 设备/配置）。
2. npm scripts 收敛为 iOS-only E2E 执行入口。
3. 新增并启用 iOS 环境自检脚本 `scripts/check_e2e_ios_env.sh`。
4. 团队流程与约束文档已改为 iOS-only。

## 后续建议
1. 开启 Detox trace 级别日志复跑：`detox test -c ios.sim.release --loglevel trace --record-logs all`。
2. 增加启动前强制清理（终止 App + 清理模拟器状态）以消除历史会话干扰。
3. 若仍失败，固定一组已验证稳定的 Xcode + iOS Runtime 版本作为团队基线。

## 本次总结输出
- 需求: 固化 iOS-only 自动化流程并执行一条真实链路
- 代码变更: Detox 配置、npm 脚本、环境检查脚本、流程文档与台账
- API 验证: 未在本次报告执行（聚焦前端 E2E链路）
- iOS E2E: FAIL（卡在 Detox-App 握手）
- 阻塞项: Detox 握手稳定性
- 风险等级: 中
