# MCP Chat UI

基于 React 的用户界面，用于与模型上下文协议（MCP）服务器交互。

## 技术栈

- **框架**: React 19 with TypeScript
- **构建工具**: Vite
- **样式**: Tailwind CSS
- **状态管理**: Zustand
- **路由**: React Router
- **国际化**: react-i18next
- **代码质量**: ESLint + Prettier

## 项目结构

```
src/
├── components/     # 可复用的 UI 组件
├── pages/         # 页面组件
├── hooks/         # 自定义 React hooks
├── store/         # Zustand 状态管理
├── utils/         # 工具函数
├── types/         # TypeScript 类型定义
├── i18n/          # 国际化配置
└── main.tsx       # 应用程序入口点
```

## 可用脚本

- `npm run dev` - 启动开发服务器
- `npm run build` - 构建生产版本
- `npm run preview` - 预览生产构建
- `npm run lint` - 运行 ESLint
- `npm run lint:fix` - 修复 ESLint 问题
- `npm run format` - 使用 Prettier 格式化代码
- `npm run format:check` - 检查代码格式

## 路径别名

项目使用路径别名以实现更清洁的导入：

- `@/*` - src/*
- `@/components/*` - src/components/*
- `@/pages/*` - src/pages/*
- `@/hooks/*` - src/hooks/*
- `@/store/*` - src/store/*
- `@/utils/*` - src/utils/*
- `@/types/*` - src/types/*
- `@/i18n/*` - src/i18n/*

## 快速开始

1. 安装依赖：
   ```bash
   npm install
   ```

2. 启动开发服务器：
   ```bash
   npm run dev
   ```

3. 在浏览器中打开 http://localhost:5173

## 开发

项目配置包括：
- TypeScript 用于类型安全
- ESLint 用于代码检查
- Prettier 用于代码格式化
- Tailwind CSS 用于样式
- 路径别名用于清洁导入
- 带有占位符组件的基本项目结构