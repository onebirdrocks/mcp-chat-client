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

interface SendMessageRequest {
  content: string;
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

// Get specific chat
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const chatId = params.id;
    const chats = readChats();
    const chat = chats.find(c => c.id === chatId);
    
    if (!chat) {
      return NextResponse.json(
        { error: 'Chat not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(chat);
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to get chat', message: error.message },
      { status: 500 }
    );
  }
}

// Send message to chat
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const chatId = params.id;
    const body: SendMessageRequest = await request.json();
    
    if (!body.content || body.content.trim() === '') {
      return NextResponse.json(
        { error: 'Message content is required' },
        { status: 400 }
      );
    }
    
    const chats = readChats();
    const chatIndex = chats.findIndex(c => c.id === chatId);
    
    if (chatIndex === -1) {
      return NextResponse.json(
        { error: 'Chat not found' },
        { status: 404 }
      );
    }
    
    const chat = chats[chatIndex];
    const now = new Date().toISOString();
    
    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: body.content.trim(),
      timestamp: now
    };
    
    chat.messages.push(userMessage);
    chat.updatedAt = now;
    
    // TODO: Call AI model to generate response
    // For now, add a mock response
    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: `这是对"${body.content}"的回复。在实际应用中，这里会调用 ${chat.modelName} 模型来生成回复。`,
      timestamp: new Date().toISOString()
    };
    
    chat.messages.push(assistantMessage);
    chat.updatedAt = new Date().toISOString();
    
    // Update chat title if it's the first message
    if (chat.messages.length === 2) {
      chat.title = body.content.slice(0, 50) + (body.content.length > 50 ? '...' : '');
    }
    
    chats[chatIndex] = chat;
    writeChats(chats);
    
    return NextResponse.json({
      chat,
      message: 'Message sent successfully'
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to send message', message: error.message },
      { status: 500 }
    );
  }
}

// Update chat (title, etc.)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const chatId = params.id;
    const body = await request.json();
    
    const chats = readChats();
    const chatIndex = chats.findIndex(c => c.id === chatId);
    
    if (chatIndex === -1) {
      return NextResponse.json(
        { error: 'Chat not found' },
        { status: 404 }
      );
    }
    
    const chat = chats[chatIndex];
    
    // Update allowed fields
    if (body.title !== undefined) {
      chat.title = body.title;
    }
    
    chat.updatedAt = new Date().toISOString();
    chats[chatIndex] = chat;
    writeChats(chats);
    
    return NextResponse.json({
      chat,
      message: 'Chat updated successfully'
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to update chat', message: error.message },
      { status: 500 }
    );
  }
}

// Delete chat
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const chatId = params.id;
    const chats = readChats();
    const chatIndex = chats.findIndex(c => c.id === chatId);
    
    if (chatIndex === -1) {
      return NextResponse.json(
        { error: 'Chat not found' },
        { status: 404 }
      );
    }
    
    chats.splice(chatIndex, 1);
    writeChats(chats);
    
    return NextResponse.json({
      message: 'Chat deleted successfully'
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to delete chat', message: error.message },
      { status: 500 }
    );
  }
}
