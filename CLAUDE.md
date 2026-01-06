# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

UIGen 是一个 AI 驱动的 React 组件生成器，具有实时预览功能。用户通过聊天界面描述想要的组件，Claude AI 通过工具调用生成代码，预览窗口实时渲染结果。

## 常用命令

### 开发环境

```bash
# 初始化项目（安装依赖 + 生成 Prisma Client + 数据库迁移）
npm run setup

# 启动开发服务器（使用 Turbopack）
npm run dev

# 后台启动开发服务器（日志写入 logs.txt）
npm run dev:daemon

# 构建生产版本
npm run build

# 启动生产服务器
npm start

# 代码检查
npm run lint
```

### 测试

```bash
# 运行所有测试（Vitest）
npm test

# 运行单个测试文件
npx vitest src/lib/__tests__/file-system.test.ts

# 运行测试（监听模式）
npx vitest --watch
```

### 数据库

```bash
# 重置数据库（强制）
npm run db:reset

# 生成 Prisma Client
npx prisma generate

# 运行迁移
npx prisma migrate dev

# 打开 Prisma Studio
npx prisma studio
```

## 环境变量配置

`.env` 文件包含三个可选配置：

```bash
# API 密钥（不设置则使用 Mock Provider）
ANTHROPIC_API_KEY="your-api-key"

# 自定义 API 端点（可选，默认 https://api.anthropic.com/v1）
ANTHROPIC_BASE_URL="https://custom-endpoint.com/v1"

# 使用的模型（可选，默认 claude-haiku-4-5）
ANTHROPIC_MODEL="claude-sonnet-4-5"
```

**重要**：修改 `.env` 后需要重启开发服务器。

## 核心架构

### 1. 虚拟文件系统 (VirtualFileSystem)

**位置**: `src/lib/file-system.ts`

- 内存中的树形文件结构，使用 Map 存储
- 支持完整的文件操作：创建、更新、删除、重命名
- 可序列化到 JSON 并保存到数据库
- 自动创建父目录

**关键方法**:
- `createFile(path, content)` - 创建文件
- `updateFile(path, content)` - 更新文件内容
- `deleteFile(path)` - 删除文件
- `replaceInFile(path, oldStr, newStr)` - 字符串替换
- `serialize()` / `deserializeFromNodes()` - 序列化

### 2. AI 工具调用系统

**位置**: `src/lib/tools/`

项目通过两个工具让 Claude AI 操作虚拟文件系统：

**str_replace_editor** (`str-replace.ts`):
- 命令：`view`, `create`, `str_replace`, `insert`, `undo_edit`
- 用于查看、创建和编辑文件内容

**file_manager** (`file-manager.ts`):
- 命令：`rename`, `delete`
- 用于重命名和删除文件/目录

**工具调用流程**:
```
用户消息 → POST /api/chat → Claude 生成工具调用
→ 工具函数执行 → VirtualFileSystem 更新
→ onFinish 保存到数据库 → 浏览器接收工具结果
→ FileSystemContext 处理 → PreviewFrame 刷新
```

### 3. 双上下文协作

**位置**: `src/lib/contexts/`

**FileSystemContext** (`file-system-context.tsx`):
- 管理 VirtualFileSystem 实例
- 处理工具调用结果 (`handleToolCall`)
- 触发预览刷新 (`refreshTrigger`)

**ChatContext** (`chat-context.tsx`):
- 集成 Vercel AI SDK 的 `useChat` hook
- 将文件系统序列化后发送给 API
- `onToolCall` 回调触发文件系统更新

**依赖关系**: ChatProvider 必须在 FileSystemProvider 内部使用。

### 4. 动态预览系统

**位置**: `src/components/preview/PreviewFrame.tsx`

**预览流程**:
1. 从 VirtualFileSystem 获取所有文件
2. 自动检测入口点（`/App.jsx`, `/App.tsx` 等）
3. 调用 `createImportMap()` 生成 ES Module import map
4. 调用 `createPreviewHTML()` 生成完整 HTML
5. 通过 iframe 的 `srcdoc` 属性注入并渲染

**JSX 转换** (`src/lib/transform/jsx-transformer.ts`):
- 使用 `@babel/standalone` 编译 JSX → JS
- 为每个文件创建 Blob URL
- 生成符合 ES Module 标准的 import map
- 从 `esm.sh` CDN 加载第三方依赖（如 React）
- 提取 CSS imports 并注入到 HTML

**Import Map 示例**:
```json
{
  "imports": {
    "react": "https://esm.sh/react@19",
    "/App.jsx": "blob:http://localhost:3000/abc123",
    "@/components/Button": "blob:http://localhost:3000/def456"
  }
}
```

### 5. 数据持久化

**位置**: `prisma/schema.prisma`

**数据模型**:
```
User (id, email, password)
  ↓ 1:N
Project (id, name, userId, messages, data)
```

- `messages`: JSON 字符串，存储完整对话历史
- `data`: JSON 字符串，存储 `fileSystem.serialize()` 的结果
- `userId` 可为空（支持匿名用户）

**保存时机**:
- API 路由的 `onFinish` 钩子 (`src/app/api/chat/route.ts`)
- 条件：`projectId` 存在且用户已认证

**Prisma Client 生成位置**: `src/generated/prisma`（非默认位置）

### 6. 认证系统

**位置**: `src/lib/auth.ts`, `src/actions/`

- JWT Token（使用 jose 库）
- bcrypt 密码加密（salt rounds: 10）
- Session 存储在 httpOnly cookie
- 有效期：7 天
- Middleware (`src/middleware.ts`) 验证每个请求

**Server Actions**:
- `signUp(email, password)` - 注册
- `signIn(email, password)` - 登录
- `signOut()` - 登出
- `getSession()` - 获取当前 session

### 7. 主要数据流

```
用户输入
  ↓
ChatContext.handleSubmit
  ├─ body: { messages, files: fileSystem.serialize(), projectId }
  ↓
POST /api/chat (Edge Runtime)
  ├─ VirtualFileSystem.deserializeFromNodes(files)
  ├─ streamText({ model, tools: [str_replace_editor, file_manager] })
  └─ onFinish: prisma.project.update()
  ↓
Stream 响应（text-delta + tool-call）
  ↓
FileSystemContext.handleToolCall
  ├─ VirtualFileSystem 操作
  └─ triggerRefresh()
  ↓
PreviewFrame 重新渲染
```

## AI 系统提示词约束

**位置**: `src/lib/prompts/generation.tsx`

当修改或扩展 AI 功能时，需遵循以下约束：

- **入口文件**：必须创建 `/App.jsx` 作为根组件
- **样式**：使用 Tailwind CSS，不使用内联样式
- **导入别名**：本地文件使用 `@/` 前缀（如 `@/components/Button`）
- **文件系统**：根路径为 `/`，这是虚拟文件系统
- **禁止 HTML**：不创建 `.html` 文件，`App.jsx` 是唯一入口

## 技术栈

- **框架**: Next.js 15 (App Router) + React 19 + TypeScript
- **样式**: Tailwind CSS v4
- **AI SDK**: @ai-sdk/anthropic + Vercel AI SDK (ai@4.3.16)
- **数据库**: Prisma + SQLite
- **编辑器**: Monaco Editor (@monaco-editor/react)
- **编译**: @babel/standalone (浏览器端 JSX 转换)
- **认证**: jose (JWT) + bcrypt
- **UI 组件**: Radix UI

## 开发注意事项

### 修改虚拟文件系统

如果修改 `VirtualFileSystem` 的序列化格式：
1. 更新 `serialize()` 和 `deserializeFromNodes()` 方法
2. 考虑数据库迁移（旧项目兼容性）
3. 更新相关测试 (`src/lib/__tests__/file-system.test.ts`)

### 添加新的 AI 工具

1. 在 `src/lib/tools/` 创建新工具文件
2. 实现符合 Vercel AI SDK 的工具接口
3. 在 `src/app/api/chat/route.ts` 的 `tools` 对象中注册
4. 在 `FileSystemContext` 添加对应的处理逻辑

### 修改预览系统

如果需要支持新的文件类型或入口点：
1. 修改 `PreviewFrame.tsx` 的入口点检测逻辑
2. 更新 `jsx-transformer.ts` 的编译规则
3. 考虑更新 AI 系统提示词

### 更改模型配置

**位置**: `src/lib/provider.ts`

- 默认模型定义在 `MODEL` 常量
- 可通过 `ANTHROPIC_MODEL` 环境变量覆盖
- Mock Provider 用于开发/演示（当无 API Key 时）

### 数据库变更

```bash
# 修改 schema.prisma 后
npx prisma migrate dev --name your_migration_name

# 重新生成 Client
npx prisma generate
```

**注意**: Prisma Client 生成到 `src/generated/prisma`，确保导入路径正确。

## 常见问题

### 预览不更新？

检查：
1. `FileSystemContext` 的 `refreshTrigger` 是否变化
2. `PreviewFrame` 是否接收到新的 `files` 数据
3. 浏览器控制台是否有 iframe 沙箱错误

### AI 工具调用失败？

检查：
1. `.env` 中的 `ANTHROPIC_API_KEY` 是否正确
2. `ANTHROPIC_BASE_URL` 是否可访问
3. `/api/chat` 的后端日志（`console.error`）

### 数据库连接错误？

```bash
# 确保数据库文件存在
npx prisma migrate dev

# 重新生成 Client
npx prisma generate
```

### Import 别名不工作？

- 确保使用 `@/` 前缀（如 `@/components/Button`）
- 检查 `tsconfig.json` 中的 paths 配置
- Vite 配置使用 `vite-tsconfig-paths` 插件
