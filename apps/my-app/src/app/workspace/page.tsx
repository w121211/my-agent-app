"use client";

import React from 'react';
import { create } from 'zustand';
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

// Zustand store
interface WorkspaceStore {
  selectedItem: ItemType | null;
  expandedFolders: Set<string>;
  setSelectedItem: (item: ItemType | null) => void;
  toggleFolder: (folderId: string) => void;
  isExpanded: (folderId: string) => boolean;
}

const useWorkspaceStore = create<WorkspaceStore>((set, get) => ({
  selectedItem: null,
  expandedFolders: new Set(['root', 't21']), // Initially expand root and first folder
  setSelectedItem: (item) => set({ selectedItem: item }),
  toggleFolder: (folderId) => set((state) => {
    const newExpanded = new Set(state.expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    return { expandedFolders: newExpanded };
  }),
  isExpanded: (folderId) => get().expandedFolders.has(folderId),
}));

// Explorer Item Component
const ExplorerItem = ({ 
  item, 
  level = 0,
}: { 
  item: ItemType; 
  level?: number;
}) => {
  const { setSelectedItem, toggleFolder, isExpanded, selectedItem } = useWorkspaceStore();
  const isOpen = isExpanded(item.id);
  const paddingLeft = `${level * 16}px`;
  
  const handleClick = () => {
    if (item.type === 'folder') {
      toggleFolder(item.id);
    } else {
      setSelectedItem(item);
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
        className={`flex items-center px-2 py-1 cursor-pointer hover:bg-gray-100 ${selectedItem?.id === item.id ? 'bg-blue-100' : ''}`}
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

// Content View Component
const ContentView = () => {
  const selectedItem = useWorkspaceStore((state) => state.selectedItem);

  if (!selectedItem) return null;

  return (
    <>
      {/* Path */}
      <div className="px-4 py-2 border-b text-sm text-gray-600">
        workspace {'>'} {selectedItem.name}
      </div>

      {/* Content */}
      {selectedItem.type === 'chat' ? (
        <ChatView content={selectedItem.content || ''} />
      ) : (
        <FileView content={selectedItem.content || ''} />
      )}
    </>
  );
};

// Main Workspace Component
const WorkspaceUI = () => {
  return (
    <div className="flex h-screen bg-white">
      {/* Explorer */}
      <div className="w-72 border-r overflow-y-auto">
        <div className="p-2 font-bold border-b">EXPLORER</div>
        <ExplorerItem item={mockData} />
      </div>

      {/* Content Area */}
      <div className="flex-grow flex flex-col">
        <ContentView />
      </div>
    </div>
  );
};

export default WorkspaceUI;