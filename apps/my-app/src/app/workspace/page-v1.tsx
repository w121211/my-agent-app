"use client";

import React, { useState } from 'react';
import { ChevronDown, ChevronRight, FileText, MessageSquare, Paperclip, Send } from 'lucide-react';

// Types
type FileType = 'chat' | 'file';
type ItemType = {
  id: string;
  name: string;
  type: FileType | 'folder';
  children?: ItemType[];
  status?: '🏃' | undefined;
  content?: string;
};

// Mock data
const mockData: ItemType = {
  id: 'root',
  name: 'workspace',
  type: 'folder',
  children: [
    {
      id: 't21',
      name: 't21-hello_world',
      type: 'folder',
      status: '🏃',
      children: [
        {
          id: 's0',
          name: 's0-planning',
          type: 'folder',
          children: [
            {
              id: 'c01',
              name: 'c01-20240121_153000.chat.json',
              type: 'chat',
              content: `[User] 請按照需求編寫...

[AI] 我已分析完需求...

[User] 這部分需要調整...

[AI] 根據反饋，我建議...`
            },
            {
              id: 'c02',
              name: 'c02-20240121_154500.chat.json',
              type: 'chat'
            }
          ]
        },
        {
          id: 's1',
          name: 's1-implementation',
          type: 'folder',
          children: [
            {
              id: 'nav1',
              name: 'navbar.v1.py',
              type: 'file',
              content: 'def create_navbar():\n    # Navbar implementation\n    pass'
            },
            {
              id: 'nav2',
              name: 'navbar.v2.py',
              type: 'file'
            },
            {
              id: 'api',
              name: 'api-spec.md',
              type: 'file'
            }
          ]
        },
        {
          id: 'task',
          name: 'task.json',
          type: 'file'
        }
      ]
    },
    {
      id: 't20',
      name: 't20-feature_xyz',
      type: 'folder'
    },
    {
      id: 't19',
      name: 't19-bug_fix',
      type: 'folder'
    }
  ]
};

// Explorer Item Component
const ExplorerItem = ({ 
  item, 
  level = 0, 
  onSelect,
  selectedId 
}: { 
  item: ItemType; 
  level?: number;
  onSelect: (item: ItemType) => void;
  selectedId: string;
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const paddingLeft = `${level * 16}px`;
  
  const handleClick = () => {
    if (item.type === 'folder') {
      setIsOpen(!isOpen);
    } else {
      onSelect(item);
    }
  };

  const icon = item.type === 'folder' 
    ? isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
    : item.type === 'chat' 
    ? <MessageSquare className="w-4 h-4" /> 
    : <FileText className="w-4 h-4" />;

  return (
    <div>
      <div 
        onClick={handleClick}
        className={`flex items-center px-2 py-1 cursor-pointer hover:bg-gray-100 ${selectedId === item.id ? 'bg-blue-100' : ''}`}
        style={{ paddingLeft }}
      >
        <span className="mr-1">{icon}</span>
        <span>{item.name}</span>
        {item.status && <span className="ml-1">{item.status}</span>}
      </div>
      {isOpen && item.children && (
        <div>
          {item.children.map(child => (
            <ExplorerItem 
              key={child.id} 
              item={child} 
              level={level + 1}
              onSelect={onSelect}
              selectedId={selectedId}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Chat Component
const ChatView = ({ content }: { content: string }) => {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-grow p-4 overflow-auto whitespace-pre-wrap">
        {content}
      </div>
      <div className="border-t p-4">
        <div className="flex items-center gap-2">
          <div className="flex-grow relative">
            <input
              type="text"
              placeholder="Write a message..."
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>
          <button className="p-2 hover:bg-gray-100 rounded-md">
            <Paperclip className="w-5 h-5" />
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-md">
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

// File View Component
const FileView = ({ content }: { content: string }) => {
  return (
    <div className="p-4">
      <pre className="whitespace-pre-wrap font-mono">{content}</pre>
    </div>
  );
};

// Main Workspace Component
const WorkspaceUI = () => {
  const [selectedItem, setSelectedItem] = useState<ItemType | null>(null);

  return (
    <div className="flex h-screen bg-white">
      {/* Explorer */}
      <div className="w-72 border-r overflow-y-auto">
        <div className="p-2 font-bold border-b">EXPLORER</div>
        <ExplorerItem 
          item={mockData} 
          onSelect={setSelectedItem}
          selectedId={selectedItem?.id || ''}
        />
      </div>

      {/* Content Area */}
      <div className="flex-grow flex flex-col">
        {selectedItem && (
          <>
            {/* Path */}
            <div className="px-4 py-2 border-b text-sm text-gray-600">
              {mockData.name} {'>'} {selectedItem.name}
            </div>

            {/* Content */}
            {selectedItem.type === 'chat' ? (
              <ChatView content={selectedItem.content || ''} />
            ) : (
              <FileView content={selectedItem.content || ''} />
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default WorkspaceUI;