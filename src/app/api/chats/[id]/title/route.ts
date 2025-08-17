import { NextRequest, NextResponse } from 'next/server';
import databaseManager from '@/lib/database-server';
import { generateSmartTitle } from '@/lib/title-generator';

// 重新生成对话标题
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await databaseManager.init();
    
    const conversation = await databaseManager.getConversation(id);
    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    // 获取对话的所有消息
    const messages = await databaseManager.getMessages(id);
    
    // 生成新标题
    const newTitle = generateSmartTitle(messages);
    
    // 更新标题
    await databaseManager.updateConversationTitle(id, newTitle);
    
    return NextResponse.json({
      title: newTitle,
      message: 'Title updated successfully'
    });
  } catch (error: any) {
    console.error('Failed to update title:', error);
    return NextResponse.json(
      { error: 'Failed to update title', message: error.message },
      { status: 500 }
    );
  }
}
