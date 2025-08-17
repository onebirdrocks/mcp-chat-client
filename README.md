# MCP Chat Client

一个现代化的MCP聊天客户端，具有丰富的自定义选项。

## 功能特性

### 个性化设置
- **用户信息配置**: 姓名、职业、个性特征设置
- **语言支持**: 支持英文、中文、日语、韩语、法语、德语
- **字体选择**: 
  - 主文本字体: Inter, Roboto, Open Sans, Lato, Poppins, Source Sans 3
  - 代码字体: JetBrains Mono, Fira Code, Source Code Pro, Inconsolata
- **实时字体预览**: 选择字体时可以实时预览效果

### 账户管理
- **个人资料**: 头像、姓名、邮箱、个人简介
- **账户安全**: 双因素认证设置
- **通知设置**: 邮件通知控制

### 视觉选项
- **深色/浅色主题**: 支持主题切换
- **默认配色**: 使用蓝色主题替代粉红色
- **鸟图标**: 用户头像使用鸟图标

## 技术栈

- **Next.js 15**: React框架
- **TypeScript**: 类型安全
- **Tailwind CSS**: 样式框架
- **Google Fonts**: 字体支持
- **Lucide React**: 图标库

## 开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 启动生产服务器
npm start
```

## 项目结构

```
src/
├── app/
│   ├── (settings)/
│   │   ├── layout.tsx          # 设置页面布局
│   │   └── settings/
│   │       ├── account/        # 账户设置
│   │       ├── customization/  # 个性化设置
│   │       └── ...
│   ├── layout.tsx              # 根布局（字体配置）
│   └── globals.css             # 全局样式
```

## 自定义功能

### 语言选择
在Customization页面的Visual Options部分，可以选择以下语言：
- English (英文)
- 中文 (Chinese)
- 日本語 (Japanese)
- 한국어 (Korean)
- Français (French)
- Deutsch (German)

### 字体选择
支持多种Google Fonts字体，包括：
- **主文本字体**: Inter, Roboto, Open Sans, Lato, Poppins, Source Sans 3
- **代码字体**: JetBrains Mono, Fira Code, Source Code Pro, Inconsolata

所有字体都支持实时预览，方便用户选择最适合的字体。
