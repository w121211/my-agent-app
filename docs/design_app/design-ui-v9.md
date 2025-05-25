<!-- docs/design_app/design-ui-v9.md -->

# AI-Assisted Workflow Application - UI Design v9 (MVP)

## Main Layout (Three-Column Design)

```
┌─────── Explorer (280px) ─────┐ ┌─────── Chat (Flexible) ──────────┐ ┌─────── Preview (360px) ──────────┐
│ 🏠 Project Folders           │ │                              │ │                                  │
│                             │ │ 🏠 Home > 📁 my-app          │ │ 🏠 Home > 📁 my-app              │
│ [+ New Chat]                 │ │ > 📋 t21-hello_world         │ │ > 📋 t21-hello_world             │
│ [+ Add Project Folder]       │ │ > chat1.v1.json              │ │ > navbar.v1.py                  │
│                             │ │                              │ │                                  │
│ ▼ 📁 my-app                 │ │ ▼ Task Knowledge & Instruction │ │ [Action Buttons]                 │
│   [+ New Chat]               │ │ ┌───────────────────────────┐ │ │ ✏️ Edit  ⬇️ Download  📤 Share    │
│   ▼ 📋 t21-hello_world 🏃 ⋮  │ │ │ <task_knowledge>          │ │ │                                  │
│     💬 chat1.v1 ⋮           │ │ │ #p1.jpg #p2.jpg           │ │ │ [Preview/Edit Area]              │
│     💬 chat2.v2 ⋮           │ │ │ </task_knowledge>           │ │ │ def create_navbar():             │
│     📄 navbar.v1.py ⋮       │ │ │ <task_instruction>          │ │ │     # Navbar implementation      │
│     📄 navbar.v2.py ⋮       │ │ │ ...                         │ │ │     ...                         │
│     📄 api-spec.md ⋮        │ │ │ </task_instruction>          │ │ │                                  │
│                            │ │ └───────────────────────────┘ │ │                                  │
│ ▼ 📁 demo-project           │ │                              │ │                                  │
│   [+ New Chat]               │ │ [Content Area]                │ │                                  │
│   ► 📋 t20-feature_xyz ✓ ⋮  │ │ [User] Please write according to requirements... [edit] │ │                                  │
│   ► a_not_task_folder ⋮      │ │                              │ │                                  │
│                            │ │ [AI] I've analyzed the requirements... │ │                                  │
│ ▼ 📁 work-notes            │ │     [copy] [retry] [...]     │ │                                  │
│   [+ New Chat]               │ │                              │ │                                  │
│   ► 📋 t19-bug_fix ✓ ⋮     │ │ [User] This part needs adjustment... [edit] │ │                                  │
│   ► 📄 meeting_notes.md ⋮   │ │                              │ │                                  │
│                            │ │ [AI] Based on feedback, I suggest... │ │                                  │
│                            │ │     [copy] [retry] [...]     │ │                                  │
│                            │ │                              │ │                                  │
│                            │ │ [Summarize ✨] Summary saved as: │ │                                  │
│                            │ │ [chat1_summary.v1.md]         │ │                                  │
│                            │ │                              │ │                                  │
│                            │ │ ------------------------------ │ │                                  │
│                            │ │                              │ │                                  │
│                            │ │ ┌─────────────────────────┐  │ │                                  │
│                            │ │ │Write a message...       │  │ │                                  │
│                            │ │ └─────────────────────────┘  │ │                                  │
│                            │ │ [📎 Attach] [Send ➤] [⚡ Extensions] │ │                                  │
│ ⚙️ SETTINGS                │ │                              │ │                                  │
└────────────────────────────┘ └──────────────────────────────┘ └──────────────────────────────────┘
```

## New Chat Button Positions

### Top-Level New Chat Button

- Located above [+ Add Project Folder]
- Used to create standalone chats (not belonging to any specific folder)
- Clicking opens new chat modal where user must select target directory

### Folder-Level New Chat Buttons

- Located as the first item under each expanded project folder
- Used to create new chats within that project folder
- Automatically sets target directory to that project folder

## Project Folders Management

### Add Project Folder Flow

After clicking [+ Add Project Folder]:

- Directly opens system file selection dialog
- After user selects folder, automatically adds to Project Folders list
- Automatically starts monitoring file changes

### Project Folder Context Menu

Right-click on project folder or click ⋮ to show:

```
┌─────────────────────┐
│ 🔄 Refresh          │
│ ❌ Remove Folder     │
└─────────────────────┘
```

### Project Folder Expand/Collapse

- Click project folder name to expand/collapse folder contents
- ▼ indicates expanded, ► indicates collapsed

## Chat Input Area

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ ┌─────────────────────────────────────────────────────────────────────────────┐ │
│ │Write a message...                                                           │ │
│ └─────────────────────────────────────────────────────────────────────────────┘ │
│ [Chat|Agent] [Claude] [📎 Upload Files] [Send ➤] [⚡ Extensions]              │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Extensions Menu

Clicking [⚡ Extensions] shows:

```
┌─────────────────────┐
│ ✨ Summarize        │
│ 🔮 What's Next?     │
│ ...                │
└─────────────────────┘
```

## Core Feature Flows

### 1. New Chat Creation Flow

Clicking [+ New Chat] under a task shows this modal:

```
┌────────── New Chat ──────────────────────────────────────────────────────┐
│                                                                       │
│ 💬 New Chat                                                             │
│                                                                       │
│ Target Directory: /Users/username/projects/my-app/t21-hello_world     │
│                                                                       │
│ ┌─────────────────────────────────────────────────────────────────┐   │
│ │<task_knowledge>                                                 │   │
│ │#p1.jpg #p2.jpg                                                 │   │
│ │</task_knowledge>                                                │   │
│ │                                                                 │   │
│ │<task_instruction>                                               │   │
│ │Please analyze these images and provide suggestions             │   │
│ │</task_instruction>                                              │   │
│ │                                                                 │   │
│ │Write a simple prompt...                                         │   │
│ └─────────────────────────────────────────────────────────────────┘   │
│                                                                       │
│ [Chat|Agent] [☑️ Create New Task] [Claude] [Create]                   │
└───────────────────────────────────────────────────────────────────────┘
```

### 2. "What's Next?" Feature Flow

Clicking [🔮 What's Next?] in the extensions menu shows this modal:

```
┌────────── What's Next? ─────────────────────────────────────────────┐
│                                                                     │
│ 🔮 What's Next?                                                     │
│                                                                     │
│ AI-suggested next actions (please select one):                      │
│                                                                     │
│ [🎯 Start implementing features based on discussion]                │
│ [🧪 Write tests for existing code]                                  │
│ [🚀 Prepare deployment configurations]                              │
│                                                                     │
│ [🔄 Regenerate suggestions] [✍️ Custom input]                        │
│                                                                     │
│ ─────────────────────────────────────────────────────────────────── │
│                                                                     │
│ 📝 Generated Prompt (based on selected action):                     │
│                                                                     │
│ ┌───────────────────────────────────────────────────────────────┐   │
│ │<task_knowledge>                                               │   │
│ │#chat1_summary.md                                              │   │
│ │</task_knowledge>                                              │   │
│ │                                                               │   │
│ │<task_instruction>                                             │   │
│ │Please start implementing features based on discussion summary │   │
│ │</task_instruction>                                            │   │
│ │                                                               │   │
│ │Please implement this feature according to the plan in         │   │
│ │#chat1_summary.md, specific requirements:                      │   │
│ │1. Follow the architecture design confirmed in discussion      │   │
│ │2. Implement core functionality logic                          │   │
│ │3. Add appropriate error handling                              │   │
│ └───────────────────────────────────────────────────────────────┘   │
│                                                                     │
│ [Chat|Agent] [☑️ Create New Task] [Claude] [Execute]                │
└─────────────────────────────────────────────────────────────────────┘
```

#### Interaction Behavior:

1. User clicks any suggested action button, which becomes highlighted
2. AI dynamically generates corresponding prompt based on selected action
3. User can edit the generated prompt
4. Clicking other suggested actions will regenerate and update the prompt
5. Clicking [🔄 Regenerate suggestions] lets AI provide new suggestion options
6. Clicking [✍️ Custom input] allows user to completely customize the next step

### 3. File Reference Flow

Using `#filepath` syntax in chat input:

```
╭─────────────────────────────────────────────╮
│ Please analyze the code in #src/navbar.py   │
│ and refer to #docs/requirements.md to       │
│ provide improvement suggestions              │
╰─────────────────────────────────────────────╯
```

Typing `#` automatically shows file suggestions:

```
┌─────────────────────────────────┐
│ 🔍 Files in current project     │
│ 📄 src/navbar.py               │
│ 📄 docs/requirements.md        │
│ 📄 tests/test_navbar.py        │
│ 📁 assets/                     │
│ ...                            │
└─────────────────────────────────┘
```

## Task and File Status Indicators

### Task Status

- ✓ - Completed
- 🏃 - Running
- ⏸️ - Paused
- ⚠️ - Warning
- 🔴 - Error

### File Type Icons

- 📋 - Task folders
- 💬 - Chat files (.json)
- 📄 - Code files (.py, .ts, .js, etc.)
- 📝 - Document files (.md, .txt, .doc, etc.)
- 🖼️ - Image files (.jpg, .png, .gif, etc.)
- 📁 - General folders
- 📦 - Special folders (node_modules, dist, etc.)

## Simplified Operation Flow

### MVP Core Features

1. **Project Folder Management**: Add/remove project folders using system file selection dialog
2. **Multi-level New Chat**: Support top-level and folder-level chat creation
3. **File References**: Use `#` syntax to quickly reference files in projects with auto-completion
4. **Extensions Menu**: Unified extension entry point including Summarize, smart suggestions, etc.
5. **Smart Suggestions**: Multi-option suggestions + dynamic prompt generation for user control
6. **File Monitoring**: Automatically monitor file changes within project folders

### Streamlined UI Elements

- Remove complex project folder setup UI, use system file dialog directly
- Simplify context menus, keep only essential functions
- Unified extension entry point to avoid UI clutter
- Clear file type icon system
- Intuitive expand/collapse interactions

## File Structure Example

```
📁 my-app/
├── 📋 t21-hello_world/
│   ├── 💬 chat1.v1.json
│   ├── 💬 chat2.v1.json
│   ├── 📄 navbar.v1.py
│   ├── 📄 navbar.v2.py
│   └── 📝 chat1_summary.md
├── 📋 t20-feature_xyz/
│   └── 💬 planning.v1.json
├── 📝 README.md
├── 📝 meeting_notes.md
└── 📄 requirements.txt
```

This design maintains MVP-stage simplicity while providing multi-project management flexibility, allowing users to easily manage multiple project folders and conduct AI-assisted workflows within them.
