# Matt Pocock Skills 使用指南

## 什么是 Matt Pocock Skills？

这是一套为 **Claude Code** 设计的工程技能包，由 [Matt Pocock](https://mattpocock.com) 创建。每个技能是一个 `/` 斜杠命令，覆盖从需求分析到代码实现的完整工程流程。

---

## 技能总览（14 个）

### 🗣️ 沟通与协作

| 技能 | 命令 | 用途 |
|------|------|------|
| **caveman** | `/caveman` | 极简模式，砍掉 ~75% token 消耗，只保留技术实质 |
| **grill-me** | `/grill-me` | 对你的方案/设计进行 relentless 拷问，穷举决策树 |
| **grill-with-docs** | `/grill-with-docs` | 同上 + 用项目文档（CONTEXT.md、ADR）来验证你的方案 |
| **handoff** | `/handoff` | 把当前对话压缩成交接文档，给下一个 agent 继续工作 |

### 📋 需求与规划

| 技能 | 命令 | 用途 |
|------|------|------|
| **to-prd** | `/to-prd` | 把对话上下文转成结构化 PRD，发布到 issue 跟踪器 |
| **to-issues** | `/to-issues` | 把 PRD/方案拆成可独立实施的 vertical slice issue |
| **triage** | `/triage` | Issue 分诊：评估 → 分类 → 分配（状态机驱动） |
| **zoom-out** | `/zoom-out` | 拉高视角，给你模块全景图和调用关系 |

### 🏗️ 编码与测试

| 技能 | 命令 | 用途 |
|------|------|------|
| **tdd** | `/tdd` | 测试驱动开发：red → green → refactor 循环 |
| **prototype** | `/prototype` | 快速原型：验证逻辑/UI 想法，用完就丢 |
| **diagnose** | `/diagnose` | 系统化 Debug：复现 → 缩小 → 假设 → 定位 → 修复 |
| **improve-codebase-architecture** | `/improve-codebase-architecture` | 架构分析：找深度模块机会，提升可测试性和 AI 可导航性 |

### ⚙️ 配置与自定义

| 技能 | 命令 | 用途 |
|------|------|------|
| **write-a-skill** | `/write-a-skill` | 创建你自己的 Claude Code 技能 |
| **setup-matt-pocock-skills** | `/setup-matt-pocock-skills` | 初始化项目配置（issue 跟踪器、标签、领域文档） |

---

## 各技能详解

---

### `/caveman` — 极简模式

**触发词：** "caveman mode", "talk like caveman", "less tokens", "be brief"

**效果：** Claude 回答砍掉所有废话：
- 去掉冠词（a/an/the）
- 去掉填充词（just, really, basically）
- 去掉客套话（sure, certainly, happy to）
- 保留所有技术实质和代码块

**停止：** 说 "stop caveman" 或 "normal mode"

**示例：**
```
你：/caveman
你：为什么 React 组件重新渲染了？
Claude：Inline obj prop -> new ref -> re-render。useMemo。
```

---

### `/grill-me` — 方案拷问

**用途：** 当你有一个方案/设计，想要被 relentlessly 挑战，穷举所有决策分支。

**过程：** Claude 会一个问题一个问题地问你，沿着决策树逐个解决，直到所有分支都搞清楚。

**示例：**
```
/grill-me 我的微服务拆分方案：把用户、订单、支付拆成三个服务
```

Claude 会逐步问：数据一致性策略？跨服务事务？服务间通信协议？失败重试机制？...

---

### `/grill-with-docs` — 文档感知的拷问

和 `/grill-me` 相同，但额外：
- 检查你的方案是否和 `CONTEXT.md` 中的术语一致
- 检查是否和已有 ADR（架构决策记录）冲突
- 拷问过程中会**就地更新** `CONTEXT.md` 和创建新的 ADR

**前提：** 需要先运行 `/setup-matt-pocock-skills` 配置项目。

---

### `/handoff` — 移交文档

**用途：** 把当前对话压缩成一个 **交接文档**，保存到系统临时目录。

下一个 agent 读到这个文档就能接手继续工作。文档包含：
- 当前进度
- 关键决策
- 待办事项
- 建议调用的技能

**示例：**
```
/handoff 下一个 session 继续实现支付模块
```

---

### `/to-prd` — 生成 PRD

**用途：** 把当前对话里讨论的需求，合成一份结构化 PRD。

**不需要再访谈你** — 直接从对话上下文中提取。

**生成内容：**
1. Problem Statement（问题陈述）
2. Solution（解决方案）
3. User Stories（用户故事，极详细）
4. Implementation Decisions（实现决策）
5. Testing Decisions（测试决策）
6. Out of Scope（不在范围内）

**发布：** 直接发到项目的 issue 跟踪器，打上 `ready-for-agent` 标签。

**前提：** 需要先运行 `/setup-matt-pocock-skills` 配置 issue 跟踪器。

---

### `/to-issues` — PRD 拆成 Issue

**用途：** 把 PRD（或任何计划）拆成可独立实施的 **vertical slice** issue。

**核心概念 — Tracer Bullet（曳光弹）：**
- 每个 issue 是贯穿所有层次的完整竖切（schema → API → UI → tests）
- 不是按层横切（"先做所有数据库、再做所有 API"）
- 每个 slice 完成后是可演示/可验证的

**Issue 类型：**
- **HITL**（Human In The Loop）：需要人工决策
- **AFK**（Away From Keyboard）：agent 可以自主完成

**过程：**
1. 探索代码库
2. 草拟竖向切片列表
3. 逐个跟你确认粒度、依赖关系
4. 按依赖顺序发布到 issue 跟踪器

**前提：** 需要先运行 `/setup-matt-pocock-skills`。

---

### `/triage` — Issue 分诊

**用途：** 管理 issue 生命周期，通过状态机驱动。

**状态流转：**
```
未标记 → needs-triage（待评估）
  → needs-info（等回复）
  → ready-for-agent（agent 可以接）
  → ready-for-human（需要人类）
  → wontfix（不做）
```

**常用指令：**
```
/triage 看看有什么需要我处理的
/triage 处理 #42
/triage 把 #42 设为 ready-for-agent
/triage 有什么 agent 可以直接接的？
```

**前提：** 需要先运行 `/setup-matt-pocock-skills`。

---

### `/zoom-out` — 拉高视角

**用途：** 当你不熟悉某段代码时，让 Claude 往上走一层抽象，给你模块全景图。

**不触发模型调用** — 只是一个 prompt 指令，让你看到更大的图景。

**示例：**
```
/zoom-out 这个 auth 模块在整个系统里是什么位置？
```

---

### `/tdd` — 测试驱动开发

**核心理念：**
- 测试**行为**，不测试**实现**
- 通过公共接口测试，不 mock 内部协作者
- 好测试读起来像规格说明："用户可以用有效购物车结账"

**流程（Tracer Bullet）：**
```
RED:   写一个测试 → 失败
GREEN: 最小代码让测试通过 → 通过
       ↓
RED:   写下一个测试 → 失败
GREEN: 最小代码通过 → 通过
       ...循环...
       ↓
REFACTOR: 所有测试通过后重构
```

**❌ 错误做法（横切）：**
```
RED:   写 test1, test2, test3, test4, test5（一口气写所有测试）
GREEN: 写 impl1, impl2, impl3, impl4, impl5
```

**✅ 正确做法（竖切）：**
```
RED→GREEN: test1→impl1
RED→GREEN: test2→impl2
...
```

---

### `/prototype` — 快速原型

**用途：** 快速验证一个想法，用完就丢。

**两条分支：**
1. **逻辑原型** — "这个状态机/数据模型对吗？" → 构建交互式终端应用
2. **UI 原型** — "这个界面长什么样？" → 在同一路由上做多个截然不同的 UI 变体

**原则：**
- 从第一天起就标记为 throwaway
- 一条命令启动
- 默认不持久化
- 不写测试、不处理错误、不做抽象
- 验证完就删除，或把结论写入 ADR/commit message

**示例：**
```
/prototype 做一个购物车状态机让我玩玩
/prototype 试试三种不同的仪表盘布局
```

---

### `/diagnose` — 系统化 Debug

**六个阶段：**

| 阶段 | 说明 |
|------|------|
| **1. 建立反馈循环** | **这是核心**。找一个快速、确定性的 pass/fail 信号。没有循环就继续造，不要跳过去读代码 |
| **2. 复现** | 跑循环，确认 bug 出现。不要修一个你没亲眼见过的 bug |
| **3. 假设** | 生成 3-5 个排名假设。每个必须可证伪："如果是 X 导致的，那么改变 Y 会消失/改变 Z 会变糟" |
| **4. 定位** | 一次只改一个变量。优先 debugger/REPL > 定向日志 > 不要 "log everything and grep" |
| **5. 修复+回归测试** | 先写回归测试再修。如果没有好的测试 seam，记下来 — 这说明架构有问题 |
| **6. 清理+复盘** | 删掉所有 debug 工具，在 commit 里记下正确的假设 |

**示例：**
```
/diagnose 用户登录后偶尔跳回首页，不是每次都发生
```

---

### `/improve-codebase-architecture` — 架构优化

**用途：** 找 **deepening opportunity** — 把浅模块变成深模块。

**核心词汇（精确使用）：**
- **Module** — 有接口和实现的任何东西
- **Interface** — 调用者需要知道的一切（不只是类型签名）
- **Depth** — 小接口背后有大行为 = 高杠杆
- **Seam** — 接口所在的位置（可以不改原代码就替换行为的地方）

**Deletion Test（删除测试）：** 想象删除这个模块。如果复杂度消失 → pass-through，不必要。如果复杂度散布到 N 个调用者 → 它确实在干活。

**过程：**
1. 探索代码库，感受摩擦
2. 展示 deepening opportunity 列表
3. 进入 grilling 会话讨论具体方案
4. 就地更新 CONTEXT.md 和创建 ADR

**前提：** 需要 `CONTEXT.md` 和 `docs/adr/`。

---

### `/write-a-skill` — 创建技能

**用途：** 创建你自己的 Claude Code 技能。

**技能结构：**
```
skill-name/
├── SKILL.md           # 主指令（必需）
├── REFERENCE.md       # 详细文档
├── EXAMPLES.md        # 使用示例
└── scripts/           # 工具脚本
    └── helper.js
```

**描述要求（这是 agent 选择技能的唯一依据）：**
- 第一句：做什么
- 第二句：什么时候触发（"Use when..."）
- 最多 1024 字符

---

### `/setup-matt-pocock-skills` — 项目初始化

**用途：** 给工程技能配置项目信息。

**三步配置：**

**A. Issue 跟踪器**
- GitHub Issues（用 `gh` CLI）
- GitLab Issues（用 `glab` CLI）
- 本地 markdown（`.scratch/<feature>/`）
- 其他（Jira、Linear 等）

**B. Triage 标签词汇**
- `needs-triage` — 待评估
- `needs-info` — 等回复
- `ready-for-agent` — agent 可接
- `ready-for-human` — 需要人
- `wontfix` — 不做

**C. 领域文档布局**
- 单上下文：一个 `CONTEXT.md` + `docs/adr/`
- 多上下文：`CONTEXT-MAP.md` 指向多个 `CONTEXT.md`

**生成文件：**
```
docs/agents/
├── issue-tracker.md    # Issue 跟踪器配置
├── triage-labels.md    # 标签映射
└── domain.md           # 领域文档布局
```

并在 `CLAUDE.md` 或 `AGENTS.md` 中添加 `## Agent skills` 区块。

---

## 典型工作流

### 从零开始做一个功能：

```
1. /to-prd                           # 把想法写成 PRD
2. 对话讨论 PRD 细节
3. /to-issues                        # 把 PRD 拆成 issue
4. /triage 处理 #1                    # 逐个分诊
5. /tdd                              # TDD 实现第一个 issue
6. /diagnose                         # 遇到 bug，系统化 debug
7. /improve-codebase-architecture    # 重构，提升代码质量
```

### Review 已有代码：

```
1. /zoom-out                         # 先看全局
2. /improve-codebase-architecture    # 找架构改进点
3. /grill-with-docs                  # 拷问方案，更新文档
```

### 快速验证想法：

```
1. /prototype                        # 做个扔掉的原型
2. 玩一下，确认想法
3. /handoff                          # 交接给下一个 session
```

---

## 前置条件

### 必须做的：

| 条件 | 说明 |
|------|------|
| 在 git 仓库中 | 大部分技能依赖项目结构 |
| 运行 `/setup-matt-pocock-skills` | 配置 issue 跟踪器、标签、领域文档 |
| GitHub CLI (`gh`) | 如果用 GitHub Issues |
| GitLab CLI (`glab`) | 如果用 GitLab Issues |

### 建议有的：

| 条件 | 受益技能 |
|------|----------|
| `CONTEXT.md`（项目术语表） | grill-with-docs, improve-codebase-architecture, to-prd, to-issues, tdd, diagnose |
| `docs/adr/`（架构决策记录） | grill-with-docs, improve-codebase-architecture |
| Issue 跟踪器 | to-prd, to-issues, triage |

---

## 常见问题

### Q: 技能不工作？

检查：
1. 是否在项目目录内（不是 home 目录）
2. 是否运行了 `/setup-matt-pocock-skills`
3. `docs/agents/` 下的配置文件是否存在

### Q: 可以修改配置吗？

可以。直接编辑 `docs/agents/*.md` 文件。不需要重新运行 setup。

### Q: 创建了新的技能放哪里？

放在 `~/.claude/skills/` 或项目的 `.claude/skills/` 目录。用 `/write-a-skill` 帮你生成。

---

> **来源：** 技能源码位于 `~/.agents/skills/`，通过符号链接挂载到 `~/.claude/skills/`
