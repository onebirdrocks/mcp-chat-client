import { NextRequest, NextResponse } from 'next/server';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

const CHATS_FILE_PATH = join(process.cwd(), '.chats.json');

interface ChatSession {
  id: string;
  title: string;
  modelName: string;
  providerName: string;
  providerId: string;
  modelId: string;
  createdAt: string;
  updatedAt: string;
  messages: Message[];
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface CreateChatRequest {
  providerId: string;
  modelId: string;
  modelName: string;
  providerName: string;
  title?: string;
}

function readChats(): ChatSession[] {
  if (!existsSync(CHATS_FILE_PATH)) {
    return [];
  }
  
  try {
    const content = readFileSync(CHATS_FILE_PATH, 'utf-8');
    return JSON.parse(content);
  } catch {
    return [];
  }
}

function writeChats(chats: ChatSession[]) {
  writeFileSync(CHATS_FILE_PATH, JSON.stringify(chats, null, 2));
}

// Get all chats
export async function GET() {
  try {
    const chats = readChats();
    
    // Return chats without messages for list view
    const chatList = chats.map(chat => ({
      id: chat.id,
      title: chat.title,
      modelName: chat.modelName,
      providerName: chat.providerName,
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
      messageCount: chat.messages.length
    }));
    
    return NextResponse.json({
      chats: chatList,
      total: chatList.length
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to get chats', message: error.message },
      { status: 500 }
    );
  }
}

// Create new chat
export async function POST(request: NextRequest) {
  try {
    const body: CreateChatRequest = await request.json();
    
    if (!body.providerId || !body.modelId || !body.modelName || !body.providerName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    const chats = readChats();
    const chatId = Date.now().toString();
    const now = new Date().toISOString();
    
    const newChat: ChatSession = {
      id: chatId,
      title: body.title || `新对话 ${chats.length + 1}`,
      modelName: body.modelName,
      providerName: body.providerName,
      providerId: body.providerId,
      modelId: body.modelId,
      createdAt: now,
      updatedAt: now,
      messages: []
    };
    
    chats.push(newChat);
    writeChats(chats);
    
    return NextResponse.json({
      chat: newChat,
      message: 'Chat created successfully'
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to create chat', message: error.message },
      { status: 500 }
    );
  }
}
