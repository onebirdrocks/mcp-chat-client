# LLM Provider 设置指南

这个应用支持多种 LLM Provider，你可以通过设置页面来配置和管理你的 API keys。

## 支持的 Provider

### 1. OpenAI
- **描述**: GPT-4, GPT-3.5 Turbo 和其他 OpenAI 模型
- **API Key**: 从 [OpenAI Platform](https://platform.openai.com/api-keys) 获取

### 2. Anthropic (Claude)
- **描述**: Claude 3, Claude 2 和其他 Anthropic 模型
- **API Key**: 从 [Anthropic Console](https://console.anthropic.com/) 获取

### 3. Google AI
- **描述**: Gemini Pro, Gemini Flash 和其他 Google 模型
- **API Key**: 从 [Google AI Studio](https://makersuite.google.com/app/apikey) 获取

### 4. Mistral AI
- **描述**: Mistral 7B, Mixtral 8x7B 和其他 Mistral 模型
- **API Key**: 从 [Mistral AI Platform](https://console.mistral.ai/) 获取

### 5. Cohere
- **描述**: Command, Command Light 和其他 Cohere 模型
- **API Key**: 从 [Cohere Platform](https://dashboard.cohere.ai/api-keys) 获取

### 6. Hugging Face
- **描述**: 访问数千个开源模型
- **API Key**: 从 [Hugging Face Settings](https://huggingface.co/settings/tokens) 获取

### 7. Perplexity
- **描述**: Perplexity 搜索和聊天模型
- **API Key**: 从 [Perplexity API](https://www.perplexity.ai/settings/api) 获取

### 8. Fireworks AI
- **描述**: 快速高效的 AI 模型
- **API Key**: 从 [Fireworks AI](https://fireworks.ai/) 获取

### 9. Groq
- **描述**: 超快速 LLM 推理
- **API Key**: 从 [Groq Console](https://console.groq.com/) 获取

### 10. Ollama
- **描述**: 本地 LLM 模型
- **API Key**: 通常不需要，本地运行

### 11. Together AI
- **描述**: 开源 AI 模型
- **API Key**: 从 [Together AI](https://together.ai/) 获取

### 12. DeepSeek
- **描述**: DeepSeek AI 模型
- **API Key**: 从 [DeepSeek](https://platform.deepseek.com/) 获取

### 13. Zhipu AI (智谱AI)
- **描述**: 中文 AI 模型
- **API Key**: 从 [智谱AI开放平台](https://open.bigmodel.cn/) 获取

### 14. Moonshot
- **描述**: Moonshot AI 模型
- **API Key**: 从 [Moonshot AI](https://www.moonshot.cn/) 获取

### 15. OpenRouter
- **描述**: 访问 300+ 来自各种提供商的模型
- **API Key**: 从 [OpenRouter](https://openrouter.ai/) 获取

## 环境变量配置

API keys 会自动保存到 `.env.local` 文件中，格式如下：

```env
# LLM Provider API Keys
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here
GOOGLE_API_KEY=your_google_api_key_here
MISTRAL_API_KEY=your_mistral_api_key_here
COHERE_API_KEY=your_cohere_api_key_here
HUGGINGFACE_API_KEY=your_huggingface_api_key_here
PERPLEXITY_API_KEY=your_perplexity_api_key_here
FIREWORKS_API_KEY=your_fireworks_api_key_here
GROQ_API_KEY=your_groq_api_key_here
OLLAMA_API_KEY=
TOGETHER_API_KEY=your_together_api_key_here
DEEPSEEK_API_KEY=your_deepseek_api_key_here
ZHIPU_API_KEY=your_zhipu_api_key_here
MOONSHOT_API_KEY=your_moonshot_api_key_here
OPENROUTER_API_KEY=your_openrouter_api_key_here
```

## 使用方法

1. 进入设置页面 → LLM
2. 点击 "Add Provider" 按钮
3. 选择你想要配置的 Provider
4. 输入对应的 API Key
5. 点击 "Add Provider" 保存
6. 使用 "Test Connection" 按钮测试连接
7. 使用 "Enable/Disable" 按钮控制 Provider 的启用状态
8. 使用 "Edit" 按钮修改 API Key
9. 使用 "Remove" 按钮删除 Provider

## 安全注意事项

- API keys 会保存在本地的 `.env.local` 文件中
- 请确保不要将 `.env.local` 文件提交到版本控制系统
- 定期轮换你的 API keys 以确保安全
- 在生产环境中，建议使用更安全的密钥管理方案

## 故障排除

### 连接测试失败
1. 检查 API key 是否正确
2. 确认网络连接正常
3. 验证 Provider 服务是否可用
4. 检查 API key 是否有足够的配额

### Provider 无法添加
1. 确认选择了正确的 Provider
2. 检查 API key 格式是否正确
3. 查看浏览器控制台是否有错误信息

### 环境变量不生效
1. 重启开发服务器
2. 确认 `.env.local` 文件在项目根目录
3. 检查文件权限是否正确
