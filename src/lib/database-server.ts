import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

const DB_PATH = join(process.cwd(), '.conversation_history.sqlite');

export interface Conversation {
  id: string;
  title: string;
  providerId: string;
  modelId: string;
  modelName: string;
  providerName: string;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

export interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  reasoningSteps?: string;
  timestamp: string;
}

// 默认的模型参数
export const DEFAULT_MODEL_PARAMS = {
  systemPrompt: "You are a helpful AI assistant. Please provide clear, accurate, and helpful responses.",
  temperature: 0.7,
  maxTokens: 4096,
  topP: 1.0,
  frequencyPenalty: 0.0,
  presencePenalty: 0.0
} as const;

class DatabaseManager {
  private db: Database | null = null;

  async init() {
    try {
      // 确保目录存在
      const dbDir = join(process.cwd());
      if (!existsSync(dbDir)) {
        mkdirSync(dbDir, { recursive: true });
      }

      this.db = await open({
        filename: DB_PATH,
        driver: sqlite3.Database
      });

      // 创建表
      await this.createTables();
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Database initialization error:', error);
      throw error;
    }
  }

  private async createTables() {
    if (!this.db) throw new Error('Database not initialized');

    // 创建对话表
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        providerId TEXT NOT NULL,
        modelId TEXT NOT NULL,
        modelName TEXT NOT NULL,
        providerName TEXT NOT NULL,
        systemPrompt TEXT,
        temperature REAL,
        maxTokens INTEGER,
        topP REAL,
        frequencyPenalty REAL,
        presencePenalty REAL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        messageCount INTEGER DEFAULT 0
      )
    `);

    // 创建消息表
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        conversationId TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
        content TEXT NOT NULL,
        reasoningSteps TEXT,
        timestamp TEXT NOT NULL,
        FOREIGN KEY (conversationId) REFERENCES conversations (id) ON DELETE CASCADE
      )
    `);

    // 创建索引
    await this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages (conversationId);
      CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations (updatedAt);
    `);
  }

  // 对话相关操作
  async createConversation(conversation: Omit<Conversation, 'messageCount'>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    await this.db.run(`
      INSERT INTO conversations (
        id, title, providerId, modelId, modelName, providerName, 
        systemPrompt, temperature, maxTokens, topP, frequencyPenalty, presencePenalty,
        createdAt, updatedAt, messageCount
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    `, [
      conversation.id,
      conversation.title,
      conversation.providerId,
      conversation.modelId,
      conversation.modelName,
      conversation.providerName,
      conversation.systemPrompt,
      conversation.temperature,
      conversation.maxTokens,
      conversation.topP,
      conversation.frequencyPenalty,
      conversation.presencePenalty,
      conversation.createdAt,
      conversation.updatedAt
    ]);
  }

  async getConversations(): Promise<Conversation[]> {
    if (!this.db) throw new Error('Database not initialized');
    
    return await this.db.all(`
      SELECT * FROM conversations 
      ORDER BY updatedAt DESC
    `);
  }

  async getConversation(id: string): Promise<Conversation | null> {
    if (!this.db) throw new Error('Database not initialized');
    
    const result = await this.db.get(`
      SELECT * FROM conversations WHERE id = ?
    `, [id]);
    
    return result || null;
  }

  async updateConversation(id: string, updates: Partial<Conversation>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updates);
    
    await this.db.run(`
      UPDATE conversations SET ${fields} WHERE id = ?
    `, [...values, id]);
  }

  async deleteConversation(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    await this.db.run(`
      DELETE FROM conversations WHERE id = ?
    `, [id]);
  }

  // 消息相关操作
  async addMessage(message: Message): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    await this.db.run(`
      INSERT INTO messages (id, conversationId, role, content, reasoningSteps, timestamp)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      message.id,
      message.conversationId,
      message.role,
      message.content,
      message.reasoningSteps ? JSON.stringify(message.reasoningSteps) : null,
      message.timestamp
    ]);

    // 更新对话的消息数量和更新时间
    await this.db.run(`
      UPDATE conversations 
      SET messageCount = messageCount + 1, updatedAt = ?
      WHERE id = ?
    `, [message.timestamp, message.conversationId]);
  }

  async getMessages(conversationId: string): Promise<Message[]> {
    if (!this.db) throw new Error('Database not initialized');
    
    const messages = await this.db.all(`
      SELECT * FROM messages 
      WHERE conversationId = ? 
      ORDER BY timestamp ASC
    `, [conversationId]);

    return messages.map(msg => ({
      ...msg,
      reasoningSteps: msg.reasoningSteps ? JSON.parse(msg.reasoningSteps) : undefined
    }));
  }

  async updateConversationTitle(id: string, title: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    await this.db.run(`
      UPDATE conversations SET title = ?, updatedAt = ? WHERE id = ?
    `, [title, new Date().toISOString(), id]);
  }

  async updateMessage(messageId: string, updates: { content?: string; reasoningSteps?: string | null }): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updates);
    
    await this.db.run(`
      UPDATE messages SET ${fields} WHERE id = ?
    `, [...values, messageId]);
  }

  async close() {
    if (this.db) {
      await this.db.close();
    }
  }
}

// 创建单例实例
const databaseManager = new DatabaseManager();

export default databaseManager;
