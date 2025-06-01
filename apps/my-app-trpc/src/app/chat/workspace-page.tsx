// apps/my-app-trpc/src/app/chat/page.tsx
"use client";

import { ChatBubbleLeftIcon, SparklesIcon } from "@heroicons/react/24/outline";

export default function WorkspacePage() {
  return (
    <div className="flex h-full items-center justify-center bg-gray-50 dark:bg-gray-900/50">
      <div className="text-center space-y-6 max-w-md mx-auto p-8">
        {/* Welcome header */}
        <div className="space-y-2">
          <ChatBubbleLeftIcon className="mx-auto size-16 text-gray-400" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Welcome to Events Core
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Your AI-powered workflow assistant is ready to help you manage
            projects, create tasks, and collaborate with AI.
          </p>
        </div>

        {/* Quick actions */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Get Started
          </h2>

          <div className="space-y-2">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <span className="text-2xl">📁</span>
              <div className="flex-1 text-left">
                <div className="font-medium text-sm">Add a project folder</div>
                <div className="text-xs text-gray-500">
                  Start by adding your first project
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <span className="text-2xl">💬</span>
              <div className="flex-1 text-left">
                <div className="font-medium text-sm">Create a new chat</div>
                <div className="text-xs text-gray-500">
                  Begin collaborating with AI
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <span className="text-2xl">📋</span>
              <div className="flex-1 text-left">
                <div className="font-medium text-sm">Manage tasks</div>
                <div className="text-xs text-gray-500">
                  Organize your workflow
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tips */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-left">
          <div className="flex items-start gap-2">
            <SparklesIcon className="size-5 text-blue-500 mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-medium text-sm text-blue-900 dark:text-blue-100">
                Pro Tips
              </div>
              <ul className="text-xs text-blue-800 dark:text-blue-200 mt-1 space-y-1">
                <li>
                  • Use{" "}
                  <code className="bg-blue-200 dark:bg-blue-800 px-1 rounded">
                    #filename
                  </code>{" "}
                  to reference files in chats
                </li>
                <li>
                  • Try the Extensions menu for quick actions like summarizing
                </li>
                <li>• Create tasks to organize related chats and files</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
