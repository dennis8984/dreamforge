'use client';

import { useState } from 'react';
import ChatSidebar from './ChatSidebar';
import ChatWindow from './ChatWindow';

interface ChatLayoutProps {
  activeConversationId?: string;
}

export default function ChatLayout({ activeConversationId }: ChatLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex h-[calc(100vh-64px)]">
      {sidebarOpen && (
        <div className="w-80 border-r border-gray-700 flex-shrink-0">
          <ChatSidebar activeId={activeConversationId} />
        </div>
      )}
      <div className="flex-1 flex flex-col">
        <ChatWindow
          conversationId={activeConversationId}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          sidebarOpen={sidebarOpen}
        />
      </div>
    </div>
  );
}
