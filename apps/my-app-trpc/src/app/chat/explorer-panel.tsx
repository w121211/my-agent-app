// apps/my-app-trpc/src/app/chat/explorer-panel.tsx
"use client";

import {
  PlusIcon,
  FolderIcon,
  DocumentIcon,
  ChatBubbleLeftIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/button";
import { trpc } from "@/lib/trpc-client";
import { AddProjectFolderDialog } from "./add-project-folder-dialog";
import { NewChatDialog } from "./new-chat-dialog";

interface ProjectFolder {
  id: string;
  name: string;
  path: string;
  createdAt: Date;
  updatedAt: Date;
}

interface Task {
  id: string;
  name: string;
  status: string;
  path: string;
}

interface Chat {
  id: string;
  fileName: string;
  path: string;
  taskId?: string;
}

export function ExplorerPanel() {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set()
  );
  const [showAddFolder, setShowAddFolder] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [selectedChatTarget, setSelectedChatTarget] = useState<string | null>(
    null
  );

  // Fetch project folders
  const { data: projectFolders = [] } =
    trpc.projectFolder.getAllProjectFolders.useQuery();

  // Fetch all tasks
  const { data: allTasks = [] } = trpc.task.getAll.useQuery();

  // Fetch all chats
  const { data: allChats = [] } = trpc.chat.getAll.useQuery();

  const toggleFolder = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const getTaskIcon = (status: string) => {
    switch (status) {
      case "completed":
        return "✓";
      case "running":
        return "🏃";
      case "paused":
        return "⏸️";
      case "error":
        return "🔴";
      default:
        return "📋";
    }
  };

  const handleNewChatForFolder = (folderPath: string) => {
    setSelectedChatTarget(folderPath);
    setShowNewChat(true);
  };

  return (
    <div className="flex h-full flex-col p-4">
      {/* Header with global actions */}
      <div className="mb-6 space-y-2">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
          Project Folders
        </h2>

        {/* Global New Chat Button */}
        <Button
          onClick={() => {
            setSelectedChatTarget(null);
            setShowNewChat(true);
          }}
          className="w-full justify-start gap-2"
          variant="outline"
          size="sm"
        >
          <PlusIcon className="size-4" />
          New Chat
        </Button>

        {/* Add Project Folder Button */}
        <Button
          onClick={() => setShowAddFolder(true)}
          className="w-full justify-start gap-2"
          variant="outline"
          size="sm"
        >
          <FolderIcon className="size-4" />
          Add Project Folder
        </Button>
      </div>

      {/* Project Folders Tree */}
      <div className="flex-1 overflow-y-auto space-y-1">
        {projectFolders.map((folder: ProjectFolder) => {
          const isExpanded = expandedFolders.has(folder.id);
          const folderTasks = allTasks.filter((task: Task) =>
            task.path.startsWith(folder.path)
          );
          const folderChats = allChats.filter((chat: Chat) =>
            chat.path.startsWith(folder.path)
          );

          return (
            <div key={folder.id} className="space-y-1">
              {/* Folder Header */}
              <div
                className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
                onClick={() => toggleFolder(folder.id)}
              >
                <span className="text-gray-500">{isExpanded ? "▼" : "►"}</span>
                <FolderIcon className="size-4 text-gray-500" />
                <span className="text-sm font-medium truncate">
                  {folder.name}
                </span>
              </div>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="ml-6 space-y-1">
                  {/* Folder-level New Chat Button */}
                  <Button
                    onClick={() => handleNewChatForFolder(folder.path)}
                    className="w-full justify-start gap-2"
                    variant="ghost"
                    size="sm"
                  >
                    <PlusIcon className="size-3" />
                    New Chat
                  </Button>

                  {/* Tasks */}
                  {folderTasks.map((task: Task) => (
                    <div key={task.id} className="space-y-1">
                      <Link
                        href={`/workspace/tasks/${task.id}`}
                        className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800"
                      >
                        <span>{getTaskIcon(task.status)}</span>
                        <span className="text-sm truncate">{task.name}</span>
                      </Link>

                      {/* Task's chats */}
                      {folderChats
                        .filter((chat: Chat) => chat.taskId === task.id)
                        .map((chat: Chat) => (
                          <Link
                            key={chat.id}
                            href={`/workspace/tasks/${task.id}/chats/${chat.id}`}
                            className="ml-4 flex items-center gap-2 rounded-md px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800"
                          >
                            <ChatBubbleLeftIcon className="size-3" />
                            <span className="text-xs truncate">
                              {chat.fileName}
                            </span>
                          </Link>
                        ))}
                    </div>
                  ))}

                  {/* Standalone Chats (not associated with tasks) */}
                  {folderChats
                    .filter((chat: Chat) => !chat.taskId)
                    .map((chat: Chat) => (
                      <Link
                        key={chat.id}
                        href={`/workspace/chats/${chat.id}`}
                        className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800"
                      >
                        <ChatBubbleLeftIcon className="size-4" />
                        <span className="text-sm truncate">
                          {chat.fileName}
                        </span>
                      </Link>
                    ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Settings */}
      <div className="mt-auto pt-4 border-t dark:border-gray-800">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2"
        >
          ⚙️ Settings
        </Button>
      </div>

      {/* Dialogs */}
      <AddProjectFolderDialog
        open={showAddFolder}
        onClose={() => setShowAddFolder(false)}
      />

      <NewChatDialog
        open={showNewChat}
        onClose={() => setShowNewChat(false)}
        targetDirectory={selectedChatTarget}
      />
    </div>
  );
}
