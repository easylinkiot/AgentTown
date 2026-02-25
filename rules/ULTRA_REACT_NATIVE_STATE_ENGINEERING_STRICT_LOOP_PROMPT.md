
---

# 强指令型工程任务执行 Prompt

## Ultra 架构级 + React Native 专用强化 + 状态管理专项 · 自动闭环

适用范围：

* Core Fix
* Create / Modify / Refactor
* Config Mutation
* Optimize
* Architecture Change
* Concurrency Control
* 状态模型重构
* Redux / Zustand / Jotai / Context
* Fabric / TurboModules
* 高并发副作用
* Hermes
* Android 14–15 / iOS 16–18

---

# 全局最高约束

* 禁止泛化解释
* 禁止理论分析
* 禁止多方案
* 禁止完整文件输出
* 禁止无关重构
* 禁止新增依赖（除非无法规避）
* 必须最小侵入
* 必须线程安全
* 必须状态闭环
* 必须生命周期安全
* 必须副作用可清理
* 必须跨端一致
* 必须避免状态漂移
* 必须避免重复订阅
* 必须避免 selector 误触发
* 必须自动逻辑回归直到 PASS

---

# 执行流程（强制顺序）

---

## STEP 0 — 环境与状态模型确认

```text
[Task Type]

[Risk Level]

[RN Version]

[Architecture]
Old / Fabric

[JS Engine]
Hermes / JSC

[State Management]
Redux / Zustand / Jotai / Context / Custom

[Affected Layer]
UI / Hook / Store / Middleware / Selector / SideEffect / Bridge / Native
```

---

# STEP 1 — 当前状态模型 vs 目标状态模型

### Fix 场景

```text
[Current Behavior]

[Expected Behavior]

[Behavior Gaps]
1.
2.
```

### 其他场景

```text
[Current State Model]
Store Shape:
Selector Graph:
Subscription Topology:
Derived State:
Side Effects:

[Target State Model]
Store Shape:
Selector Graph:
Subscription Topology:
Derived State:
Side Effects:

[State Delta]
1.
2.
3.
```

必须明确：

* 状态字段变化
* selector 变化
* 订阅数量变化
* 副作用触发点变化
* render 触发次数变化

---

# STEP 2 — 状态传播与执行链

必须精确到：

* Store 写入点
* reducer / set
* middleware
* selector
* useStore / useSelector
* 组件订阅
* useEffect 依赖
* cleanup 位置

```text
[State Execution Chain]
Event → Dispatch/Set → Reducer/Mutation →
Store Update → Subscription Trigger →
Selector Recompute → Component Re-render →
SideEffect → Visible Output
```

并补充：

```text
[State Consistency Model]
Atomicity:
Reentrancy:
Async Race:
Selector Stability:
Subscription Cleanup:
```

---

# STEP 3 — 主执行方向

```text
[Primary Direction]

[State Consistency Guard]
No Double Subscription:
No Stale Closure:
No Uncontrolled Mutation:
No Extra Re-render:
Stable Selector Output:

[Secondary Factors]
1.
2.
```

只能一个主方向。

---

# STEP 4 — 状态专项执行策略

```text
[Execution Strategy]
Mutation Boundary:
Selector Strategy:
Subscription Strategy:
Memoization Rule:
SideEffect Isolation:
Concurrency Control:
Cleanup Guarantee:
Render Guard:
```

必须说明：

* 是否影响 selector equality
* 是否影响 shallow compare
* 是否影响 Redux batching
* 是否影响 Zustand selector stability
* 是否影响 Jotai atom dependency
* 是否影响 Context re-render 级联
* 是否增加渲染次数

---

# STEP 5 — 最小侵入 diff 输出

规则：

* 仅输出改动代码
* 标注文件路径
* 禁止完整文件
* 禁止重复未改动代码

替换：

```diff
- old
+ new
```

新增：

```diff
+ code
```

删除：

```diff
- code
```

---

# STEP 6 — 状态专项逻辑回归闭环

禁止：

* 启动脚本
* 跑测试命令
* CI

必须：

* 状态流推演
* 订阅拓扑推演
* selector 重算推演
* render 次数推演
* 并发写入推演
* 卸载清理推演
* Bridge 推演
* Fabric commit 推演

---

# 强制测试覆盖（≥20）

必须包含：

* 快速连续 dispatch
* 同步多次 set
* 异步请求返回顺序反转
* dispatch 在组件卸载后
* selector 返回新引用
* selector equality 边界
* shallow compare 失效场景
* derived state 变化
* middleware 并发
* 状态重入
* 多组件订阅同一 slice
* 组件快速卸载重挂载
* 前后台切换
* 低端设备高频更新
* JS 线程阻塞
* React 18 批量更新
* Fabric commit 差异
* Hermes GC
* 热更新
* 状态初始化重复执行

---

# 机型矩阵（必须覆盖）

Android：

* Pixel 8 (Android 15)
* Samsung S24
* Xiaomi 14
* OPPO / OnePlus
* Redmi Note
* Galaxy A

iOS：

* iPhone 12
* iPhone 15
* iPhone 16
* iPhone 17

---

# 测试输出格式

```text
[Test Case 1]
Device:
Scenario:
Action:
Expected:
Result: PASS / FAIL
```

最终：

```text
[Regression Summary]
Total:
PASS:
FAIL:
Final Status:
```

若 FAIL > 0：

* 输出增量 diff
* 重新完整 STEP 6
* 直到 Final Status: PASS

---

# 状态管理专项强制检查清单

* 不允许直接 mutation（Redux）
* 不允许 selector 返回不稳定引用
* 不允许 useSelector 无 equality
* 不允许 Zustand set 导致全局 re-render
* 不允许 atom 依赖环
* 不允许 Context 导致级联刷新
* 不允许 stale closure
* 不允许 dispatch 在 unmounted 后触发 setState
* 不允许 middleware 造成递归 dispatch
* 不允许重复 store 初始化
* 不允许 hydration 重复执行
* 不允许 Fabric 下状态与 UI 不一致

---

# 强制终止条件

* 不允许状态漂移
* 不允许重复订阅
* 不允许额外 re-render
* 不允许竞态
* 不允许跨端差异
* 必须全部 PASS 才结束

---
