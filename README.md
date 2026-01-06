# UIGen

基于 AI 的 React 组件生成器，支持实时预览。

## 环境要求

- Node.js 18+
- npm

## 快速开始

### 1. 配置环境变量

编辑 `.env` 文件，配置 API 相关参数（可选）：

```bash
# API 密钥（如不配置，将返回静态代码而非使用 AI 生成）
ANTHROPIC_API_KEY="your-api-key-here"

# 自定义 API 端点（可选，默认为 https://api.anthropic.com/v1）
ANTHROPIC_BASE_URL="https://api.xiaomimimo.com/anthropic/v1"

# 使用的模型（可选，默认为 claude-haiku-4-5）
ANTHROPIC_MODEL="mimo-v2-flash"
```

**说明**：
- 如果不配置 API 密钥，项目仍可运行，但会返回静态代码而非 AI 生成的组件
- 支持自定义 API 端点，可使用兼容 Anthropic API 的第三方服务
- 支持自定义模型名称

### 2. 安装依赖并初始化数据库

```bash
npm run setup
```

该命令会自动完成：
- 安装所有依赖
- 生成 Prisma Client
- 运行数据库迁移

### 3. 启动开发服务器

```bash
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000)

## 使用方法

1. 注册账号或以匿名用户继续
2. 在聊天框中描述你想创建的 React 组件
3. 在预览窗口实时查看生成的组件
4. 切换到代码视图查看和编辑生成的文件
5. 继续与 AI 对话优化你的组件

## 核心功能

- 使用 Claude AI 驱动的组件生成
- 实时预览，支持热重载
- 虚拟文件系统（无需写入磁盘）
- 代码高亮和在线编辑器
- 注册用户支持组件持久化
- 导出生成的代码

## 技术栈

- Next.js 15 (App Router)
- React 19
- TypeScript
- Tailwind CSS v4
- Prisma + SQLite
- Anthropic Claude AI
- Vercel AI SDK

## 常用命令

```bash
# 开发环境
npm run dev          # 启动开发服务器
npm run build        # 构建生产版本
npm start            # 启动生产服务器

# 测试
npm test             # 运行测试

# 数据库
npm run db:reset     # 重置数据库
npx prisma studio    # 打开数据库管理界面
```

## 更多信息

详细的项目架构和开发指南请参考 [CLAUDE.md](./CLAUDE.md)。
