# OOBT Models Configuration

这个项目现在使用 `oobt-models.json` 文件来管理所有预设的AI模型配置，无需修改代码即可增减模型。

## 文件结构

```
oobt-models.json
├── openai: [模型列表]
├── anthropic: [模型列表]
├── google: [模型列表]
├── mistral: [模型列表]
├── cohere: [模型列表]
├── perplexity: [模型列表]
├── fireworks: [模型列表]
├── groq: [模型列表]
├── deepseek: [模型列表]
├── openrouter: [模型列表]
├── huggingface: [模型列表]
├── ollama: [模型列表]
├── together: [模型列表]
├── zhipu: [模型列表]
└── moonshot: [模型列表]
```

## 模型格式

每个模型包含以下字段：

```json
{
  "id": "模型ID",
  "name": "显示名称",
  "description": "模型描述"
}
```

## 如何修改模型

### 添加新模型

1. 打开 `oobt-models.json` 文件
2. 找到对应的提供商部分
3. 添加新的模型对象：

```json
{
  "id": "your-new-model-id",
  "name": "Your New Model",
  "description": "Description of your new model"
}
```

### 删除模型

1. 打开 `oobt-models.json` 文件
2. 找到对应的提供商部分
3. 删除不需要的模型对象

### 修改现有模型

1. 打开 `oobt-models.json` 文件
2. 找到对应的模型
3. 修改 `name` 或 `description` 字段

## 支持的提供商

目前支持以下AI提供商：

- **OpenAI** - GPT系列模型
- **Anthropic** - Claude系列模型
- **Google** - Gemini系列模型
- **Mistral** - Mistral系列模型
- **Cohere** - Command系列模型
- **Perplexity** - Llama系列模型
- **Fireworks** - Fireworks模型
- **Groq** - Groq模型
- **DeepSeek** - DeepSeek模型
- **OpenRouter** - 聚合模型
- **Hugging Face** - Hugging Face模型
- **Ollama** - Ollama模型
- **Together AI** - Together模型
- **Zhipu AI** - GLM系列模型
- **Moonshot** - Moonshot模型

## 注意事项

1. **模型ID格式**：确保模型ID符合对应提供商的格式要求
2. **AI SDK支持**：只有支持AI SDK的提供商才能在模型测试功能中使用
3. **文件格式**：保持JSON格式正确，可以使用在线JSON验证工具检查
4. **备份**：修改前建议备份原始文件

## 代码集成

系统会自动从 `oobt-models.json` 文件读取配置：

- **验证系统** (`src/lib/validation/model-validation.ts`) - 读取预设模型进行验证
- **AI SDK管理器** (`src/lib/ai-sdk-model-manager.ts`) - 动态生成AI SDK模型实例
- **API路由** (`src/app/api/llm/models/route.ts`) - 提供模型数据给前端

## 示例

### 添加新的OpenAI模型

```json
{
  "openai": [
    {
      "id": "gpt-4o",
      "name": "GPT-4o",
      "description": "Latest GPT-4 model with improved performance"
    },
    {
      "id": "gpt-4o-mini",
      "name": "GPT-4o Mini", 
      "description": "Fast and efficient GPT-4 model"
    },
    {
      "id": "your-custom-model",
      "name": "Your Custom Model",
      "description": "Your custom model description"
    }
  ]
}
```

### 添加新的提供商

如果需要添加新的提供商，需要：

1. 在 `oobt-models.json` 中添加新的提供商部分
2. 确保代码中有对应的AI SDK支持
3. 更新验证规则（如果需要）

## 故障排除

### 文件不存在
如果 `oobt-models.json` 文件不存在，系统会使用空的预设模型列表。

### JSON格式错误
如果JSON格式有误，系统会记录错误并使用空的预设模型列表。

### 模型不显示
检查：
1. 模型ID格式是否正确
2. 提供商是否在支持的列表中
3. 是否有API密钥配置
