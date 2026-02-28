# AgentTown Working Agreement

## Stack
- Expo + Expo Router
- React Native + TypeScript
- One codebase for iOS, Android, and Web

## Development Contract
- Keep changes incremental and ship-ready.
- Prefer shared components and shared domain logic.
- Preserve strict TypeScript mode.
- Every behavior change should include tests or a clear test gap note.

## 代码提交强制校验规范

### 一、提交前强制验证要求

在进行代码提交（push 至 GitHub）或创建 PR 前，必须严格执行以下验证流程：

- 所有既定校验项必须全部通过
- 任意一项未通过，视为本次提交不合格
- 不允许在校验未完成或失败的情况下提交代码或创建 PR

---

### 二、PR 创建前必须执行的命令

在打开 Pull Request 之前，必须依次运行以下命令：

- `npm run typecheck`
- `npm run lint`
- `npm run test:ci`
- `npm run build:web`

要求：

- 所有命令必须执行成功
- 不允许忽略报错
- 不允许跳过任何步骤

---

### 三、失败处理机制

若本次代码更新导致以下任意验证不通过：

- 单元测试失败  
- 构建失败  
- 类型检查失败（TypeScript 等）  
- Lint 校验失败  
- CI 校验脚本失败  
- 项目中定义的其他强制校验流程失败  

则必须执行以下处理：

- ❌ 禁止提交代码至 GitHub  
- ❌ 禁止创建或合并 PR  
- ✅ 修复问题后重新执行完整验证流程  
- ✅ 所有验证通过后方可提交或发起 PR  

---

### 四、执行方式要求

为确保规则强制执行，应采用以下机制：

- 本地 Git Hooks（如 pre-commit / pre-push）进行拦截
- CI 作为最终强制校验与兜底机制
- 禁止绕过验证流程进行提交或合并

---

### 五、约束原则

- 不允许通过临时关闭测试或规则规避校验
- 不允许提交处于失败状态的代码
- 所有提交必须保持：
  - 可构建
  - 可运行
  - 可测试通过
  - 符合代码规范

---

### 六、目标
- 确保每一次提交与 PR 均处于稳定、可验证、可回滚的安全状态，保障主分支代码质量与团队协作效率。


## 规则优先级说明：
- AGENTS > rules > skills > docs
### 一、冲突解决优先级
当不同来源的规则或配置发生冲突时，按以下优先级处理（从高到低）：
```
AGENTS > rules > skills > docs
```

即：
1. **AGENTS** 优先级最高
2. 其次是 **rules**
2. 其次是 **skills**
4. 再次是 **docs**

### 二、rules 与 docs 冲突处理
当 `rules` 与 `docs` 内容冲突时：
* 必须以 **rules** 为准
* docs 仅作为补充说明或参考，不具备覆盖规则的能力

### 三、skills 加载机制说明
* `skills` 默认仅加载：
- `AGENTS.md`
- `SKILL.md`
* 通过上述文件中的索引信息，决定是否加载对应的其他 `.md` 文件
* 不允许无索引直接加载额外文档
