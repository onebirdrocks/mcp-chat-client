// 标题生成工具

/**
 * 根据对话内容生成标题
 * @param messages 对话消息数组
 * @returns 生成的标题
 */
export function generateTitle(messages: Array<{ role: string; content: string }>): string {
  if (messages.length === 0) {
    return '新对话';
  }

  // 获取用户消息
  const userMessages = messages
    .filter(msg => msg.role === 'user')
    .map(msg => msg.content.trim())
    .filter(content => content.length > 0);

  if (userMessages.length === 0) {
    return '新对话';
  }

  // 使用第一条用户消息生成标题
  const firstMessage = userMessages[0];
  
  // 如果消息很短，直接使用
  if (firstMessage.length <= 20) {
    return firstMessage;
  }

  // 提取关键信息生成标题
  const title = extractTitleFromMessage(firstMessage);
  
  return title || '新对话';
}

/**
 * 从消息中提取标题
 * @param message 用户消息
 * @returns 提取的标题
 */
function extractTitleFromMessage(message: string): string {
  // 清理消息内容
  let cleanMessage = message
    .replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s，。！？、：；""''（）【】]/g, '') // 移除特殊字符
    .trim();

  // 如果消息包含换行，只取第一行
  if (cleanMessage.includes('\n')) {
    cleanMessage = cleanMessage.split('\n')[0].trim();
  }

  // 如果消息太长，截取前30个字符
  if (cleanMessage.length > 30) {
    cleanMessage = cleanMessage.substring(0, 30);
    // 确保不在单词中间截断
    const lastSpace = cleanMessage.lastIndexOf(' ');
    if (lastSpace > 20) {
      cleanMessage = cleanMessage.substring(0, lastSpace);
    }
    cleanMessage += '...';
  }

  return cleanMessage || '新对话';
}

/**
 * 根据消息内容智能生成更准确的标题
 * @param messages 对话消息数组
 * @returns 智能生成的标题
 */
export function generateSmartTitle(messages: Array<{ role: string; content: string }>): string {
  if (messages.length === 0) {
    return '新对话';
  }

  const userMessages = messages
    .filter(msg => msg.role === 'user')
    .map(msg => msg.content.trim())
    .filter(content => content.length > 0);

  if (userMessages.length === 0) {
    return '新对话';
  }

  const firstMessage = userMessages[0];
  
  // 检测常见的问题类型
  const title = detectQuestionType(firstMessage);
  
  return title || generateTitle(messages);
}

/**
 * 检测问题类型并生成相应标题
 * @param message 用户消息
 * @returns 生成的标题
 */
function detectQuestionType(message: string): string {
  const lowerMessage = message.toLowerCase();
  
  // 编程相关问题
  if (lowerMessage.includes('代码') || lowerMessage.includes('编程') || lowerMessage.includes('bug') || 
      lowerMessage.includes('error') || lowerMessage.includes('function') || lowerMessage.includes('class')) {
    return '编程问题';
  }
  
  // 数学问题
  if (lowerMessage.includes('计算') || lowerMessage.includes('数学') || lowerMessage.includes('公式') ||
      lowerMessage.includes('equation') || lowerMessage.includes('calculate') || lowerMessage.includes('math')) {
    return '数学问题';
  }
  
  // 写作相关
  if (lowerMessage.includes('写作') || lowerMessage.includes('文章') || lowerMessage.includes('文案') ||
      lowerMessage.includes('write') || lowerMessage.includes('essay') || lowerMessage.includes('content')) {
    return '写作帮助';
  }
  
  // 翻译相关
  if (lowerMessage.includes('翻译') || lowerMessage.includes('translate') || lowerMessage.includes('英文') ||
      lowerMessage.includes('中文') || lowerMessage.includes('english') || lowerMessage.includes('chinese')) {
    return '翻译服务';
  }
  
  // 解释说明
  if (lowerMessage.includes('解释') || lowerMessage.includes('说明') || lowerMessage.includes('什么是') ||
      lowerMessage.includes('explain') || lowerMessage.includes('what is') || lowerMessage.includes('how to')) {
    return '概念解释';
  }
  
  // 创意相关
  if (lowerMessage.includes('创意') || lowerMessage.includes('想法') || lowerMessage.includes('建议') ||
      lowerMessage.includes('idea') || lowerMessage.includes('creative') || lowerMessage.includes('suggestion')) {
    return '创意讨论';
  }
  
  // 学习相关
  if (lowerMessage.includes('学习') || lowerMessage.includes('教程') || lowerMessage.includes('如何') ||
      lowerMessage.includes('learn') || lowerMessage.includes('tutorial') || lowerMessage.includes('how to')) {
    return '学习指导';
  }
  
  // 分析相关
  if (lowerMessage.includes('分析') || lowerMessage.includes('比较') || lowerMessage.includes('评估') ||
      lowerMessage.includes('analyze') || lowerMessage.includes('compare') || lowerMessage.includes('evaluate')) {
    return '分析讨论';
  }
  
  return '';
}
