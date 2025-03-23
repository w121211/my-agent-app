# Web UI 設計

## 完整版工作區頁面

```
┌─────── Explorer (280px) ─────────┐ ┌─────── Chat (彈性) ─────────────┐ ┌─────── Preview (360px) ──────────┐
│ 🏠                               │ │                                 │ │                                  │
│                                 │ │ 🏠 Home > 👥 Workspace          │ │ 🏠 Home > 👥 Workspace           │
│ ▼ workspace                     │ │ > t21-hello_world > s0-planning │ │ > t21-hello_world > s1-implement │
│   ▼ t21-hello_world 🏃          │ │                                 │ │                                  │
│     [+ 新聊天]                   │ │ t21-hello_world >               │ │ t21-hello_world >                │
│     ▼ s0-planning ✓             │ │   s0-planning >                 │ │   s1-implementation >            │
│       [+ 新聊天]                 │ │     c01-20240121_153000.chat.js │ │     navbar.v1.py                │
│       💬 c01-20240121_153000.. │ │                                 │ │                                  │
│       💬 c02-20240121_154500.. │ │ [User] 請按照需求編寫...        │ │ [操作按鈕]                        │
│                                │ │                                │ │ ✏️ Edit  ⬇️ Download  📤 Share    │
│     ▼ s1-implementation 🏃      │ │ [AI] 我已分析完需求...           │ │                                  │
│       [+ 新聊天]                 │ │                                │ │ [預覽/編輯區域]                    │
│       💬 c01-20240121_153000.. │ │ [User] 這部分需要調整...        │ │ def create_navbar():             │
│       💬 c02-20240121_154500.. │ │                                │ │     # Navbar implementation      │
│       📄 navbar.v1.py          │ │ [AI] 根據反饋，我建議...         │ │     ...                         │
│       📄 navbar.v2.py          │ │                                │ │                                  │
│       📄 api-spec.md           │ │ 👤 Alice 正在編輯...             │ │                                  │
│                                │ │ 👤 Bob 正在查看...              │ │                                  │
│     ▼ task_history            │ │                                │ │                                  │
│       [+ 新聊天]                │ │                                │ │                                  │
│       📄 task.20240121_1530.. │ │                                │ │                                  │
│       📄 task.20240121_1545.. │ │                                │ │                                  │
│                                │ │--------------------------------│ │                                  │
│     📄 task.json              │ │ [輸入區]                       │ │                                  │
│                                │ │ ╭─────────────────────────╮    │ │                                  │
│   ► t20-feature_xyz ✓         │ │ │Write a message...       │    │ │                                  │
│   ► t19-bug_fix ✓             │ │ ╰─────────────────────────╯    │ │                                  │
│                                │ │ [📎附件] [🎨插入] [發送 ➤]       │ │                                  │
│ [視圖切換]                      │ │                                │ │                                  │
│ 📁 EXPLORER                    │ │                                │ │                                  │
│ 🔍 SEARCH                      │ │                                │ │                                  │
│ ⚙️ SETTINGS                    │ │                                │ │                                  │
└────────────────────────────────┘ └────────────────────────────────┘ └──────────────────────────────────┘
```

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1020 600">
  <!-- 背景 -->
  <rect width="1020" height="600" fill="#f5f5f5"/>

  <!-- 三個區塊的背景 -->
  <rect x="10" y="10" width="280" height="580" fill="white" rx="5" ry="5" stroke="#ddd" stroke-width="1"/>
  <rect x="300" y="10" width="360" height="580" fill="white" rx="5" ry="5" stroke="#ddd" stroke-width="1"/>
  <rect x="670" y="10" width="340" height="580" fill="white" rx="5" ry="5" stroke="#ddd" stroke-width="1"/>

  <!-- 標題區域 -->
  <text x="30" y="40" font-family="Arial" font-size="18" fill="#333">🏠</text>

  <text x="320" y="40" font-family="Arial" font-size="14" fill="#666">🏠 Home > 👥 Workspace</text>
  <text x="320" y="60" font-family="Arial" font-size="14" fill="#666">> t21-hello_world > s0-planning</text>

  <text x="690" y="40" font-family="Arial" font-size="14" fill="#666">🏠 Home > 👥 Workspace</text>
  <text x="690" y="60" font-family="Arial" font-size="14" fill="#666">> t21-hello_world > s1-implement</text>

  <!-- Explorer 側邊欄 -->
  <text x="30" y="80" font-family="Arial" font-size="14" fill="#333">▼ workspace</text>
  <text x="45" y="100" font-family="Arial" font-size="14" fill="#333">▼ t21-hello_world 🏃</text>
  <text x="60" y="120" font-family="Arial" font-size="14" fill="#777">[+ 新聊天]</text>
  <text x="60" y="140" font-family="Arial" font-size="14" fill="#333">▼ s0-planning ✓</text>
  <text x="75" y="160" font-family="Arial" font-size="14" fill="#777">[+ 新聊天]</text>
  <text x="75" y="180" font-family="Arial" font-size="14" fill="#333">💬 c01-20240121_153000..</text>
  <text x="75" y="200" font-family="Arial" font-size="14" fill="#333">💬 c02-20240121_154500..</text>

  <text x="60" y="240" font-family="Arial" font-size="14" fill="#333">▼ s1-implementation 🏃</text>
  <text x="75" y="260" font-family="Arial" font-size="14" fill="#777">[+ 新聊天]</text>
  <text x="75" y="280" font-family="Arial" font-size="14" fill="#333">💬 c01-20240121_153000..</text>
  <text x="75" y="300" font-family="Arial" font-size="14" fill="#333">💬 c02-20240121_154500..</text>
  <text x="75" y="320" font-family="Arial" font-size="14" fill="#0066cc">📄 navbar.v1.py</text>
  <text x="75" y="340" font-family="Arial" font-size="14" fill="#333">📄 navbar.v2.py</text>
  <text x="75" y="360" font-family="Arial" font-size="14" fill="#333">📄 api-spec.md</text>

  <text x="60" y="400" font-family="Arial" font-size="14" fill="#333">▼ task_history</text>
  <text x="75" y="420" font-family="Arial" font-size="14" fill="#777">[+ 新聊天]</text>
  <text x="75" y="440" font-family="Arial" font-size="14" fill="#333">📄 task.20240121_1530..</text>
  <text x="75" y="460" font-family="Arial" font-size="14" fill="#333">📄 task.20240121_1545..</text>

  <text x="60" y="500" font-family="Arial" font-size="14" fill="#333">📄 task.json</text>

  <text x="45" y="520" font-family="Arial" font-size="14" fill="#333">► t20-feature_xyz ✓</text>
  <text x="45" y="540" font-family="Arial" font-size="14" fill="#333">► t19-bug_fix ✓</text>

  <text x="30" y="570" font-family="Arial" font-size="12" fill="#666">[視圖切換]</text>
  <text x="30" y="585" font-family="Arial" font-size="12" fill="#666">📁 EXPLORER  🔍 SEARCH  ⚙️ SETTINGS</text>

  <!-- 中間聊天區域 -->
  <text x="320" y="100" font-family="Arial" font-size="14" fill="#333">t21-hello_world ></text>
  <text x="320" y="120" font-family="Arial" font-size="14" fill="#333">  s0-planning ></text>
  <text x="320" y="140" font-family="Arial" font-size="14" fill="#333">    c01-20240121_153000.chat.js</text>

  <rect x="320" y="170" width="320" height="40" fill="#f5f7fa" rx="5" ry="5"/>
  <text x="330" y="195" font-family="Arial" font-size="14" fill="#333">[User] 請按照需求編寫...</text>

  <rect x="320" y="220" width="320" height="40" fill="#e6f3ff" rx="5" ry="5"/>
  <text x="330" y="245" font-family="Arial" font-size="14" fill="#333">[AI] 我已分析完需求...</text>

  <rect x="320" y="270" width="320" height="40" fill="#f5f7fa" rx="5" ry="5"/>
  <text x="330" y="295" font-family="Arial" font-size="14" fill="#333">[User] 這部分需要調整...</text>

  <rect x="320" y="320" width="320" height="40" fill="#e6f3ff" rx="5" ry="5"/>
  <text x="330" y="345" font-family="Arial" font-size="14" fill="#333">[AI] 根據反饋，我建議...</text>

  <text x="330" y="380" font-family="Arial" font-size="14" fill="#66cc99">👤 Alice 正在編輯...</text>
  <text x="330" y="400" font-family="Arial" font-size="14" fill="#6699cc">👤 Bob 正在查看...</text>

  <!-- 分隔線 -->
  <line x1="300" y1="520" x2="660" y2="520" stroke="#ddd" stroke-width="1"/>

  <!-- 輸入區域 -->
  <text x="320" y="540" font-family="Arial" font-size="12" fill="#666">[輸入區]</text>
  <rect x="320" y="550" width="320" height="30" fill="white" rx="5" ry="5" stroke="#ddd" stroke-width="1"/>
  <text x="330" y="570" font-family="Arial" font-size="14" fill="#999">Write a message...</text>
  <text x="320" y="590" font-family="Arial" font-size="12" fill="#666">[📎附件] [🎨插入] [發送 ➤]</text>

  <!-- 右側預覽區域 -->
  <text x="690" y="100" font-family="Arial" font-size="14" fill="#333">t21-hello_world ></text>
  <text x="690" y="120" font-family="Arial" font-size="14" fill="#333">  s1-implementation ></text>
  <text x="690" y="140" font-family="Arial" font-size="14" fill="#0066cc">    navbar.v1.py</text>

  <text x="690" y="180" font-family="Arial" font-size="12" fill="#666">[操作按鈕]</text>
  <text x="690" y="200" font-family="Arial" font-size="14" fill="#333">✏️ Edit  ⬇️ Download  📤 Share</text>

  <text x="690" y="240" font-family="Arial" font-size="12" fill="#666">[預覽/編輯區域]</text>
  <rect x="690" y="250" width="300" height="120" fill="#f8f8f8" rx="5" ry="5" stroke="#ddd" stroke-width="1"/>
  <text x="700" y="270" font-family="monospace" font-size="14" fill="#333">def create_navbar():</text>
  <text x="700" y="290" font-family="monospace" font-size="14" fill="#333">    # Navbar implementation</text>
  <text x="700" y="310" font-family="monospace" font-size="14" fill="#333">    ...</text>
</svg>
```

## MVP 簡化版

```
┌─────── Explorer (280px) ─────────┐ ┌─────── Chat/Preview (彈性) ───────────────────────────────────────┐
│ 🏠                               │ │                                                                  │
│                                 │ │ 🏠 Home > 👥 Workspace > t21-hello_world > s2-development        │
│ [+ 新任務]                       │ │ > c01-20240121_153000.chat.json                                  │
│                                 │ │                                                                  │
│ ▼ workspace                     │ │ [內容區域]                                                       │
│   ▼ t21-hello_world 🏃 ⏸️        │ │ # 聊天檔案時：                                                   │
│     [+ 新聊天]                   │ │ [User] 請按照需求編寫...                                         │
│     ▼ s1-planning ✓ ▶️          │ │                                                                  │
│       [+ 新聊天]                 │ │ [AI] 我已分析完需求...                                           │
│       💬 c01-20240121_153000.. │ │                                                                  │
│       💬 c02-20240121_154500.. │ │ [User] 這部分需要調整...                                         │
│                                │ │                                                                  │
│     ▼ s2-development 🔴 🔍      │ │ [AI] 根據反饋，我建議...                                         │
│       [+ 新聊天]                │ │                                                                  │
│       💬 c01-20240121_153000.. │ │                                                                  │
│       📄 navbar.v1.py          │ │                                                                  │
│       📄 navbar.v2.py          │ │                                                                  │
│       📄 api-spec.md           │ │                                                                  │
│                                │ │                                                                  │
│     ▼ s3-testing ⚠️            │ │                                                                  │
│       [+ 新聊天]                │ │                                                                  │
│       (無檔案)                  │ │ # 一般檔案時：                                                   │
│                                │ │ [檔案內容預覽/編輯]                                              │
│     ▼ s4-deployment 📝 ▶️      │ │                                                                  │
│       [+ 新聊天]                │ │                                                                  │
│       (無檔案)                  │ │                                                                  │
│                                │ │--------------------------------                                  │
│     📄 task.json              │ │ ╭─────────────────────────╮                                     │
│                                │ │ │Write a message...       │                                     │
│   ► t20-feature_xyz ✓ ▶️       │ │ ╰─────────────────────────╯                                     │
│   ► t19-bug_fix ✓ ▶️           │ │ [📎附件] [發送 ➤]                                               │
│                                │ │                                                                  │
│ ⚙️ SETTINGS                    │ │                                                                  │
└────────────────────────────────┘ └──────────────────────────────────────────────────────────────────┘
```

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1020 600">
  <!-- 背景 -->
  <rect width="1020" height="600" fill="#f5f5f5"/>

  <!-- 兩個區塊的背景 -->
  <rect x="10" y="10" width="280" height="580" fill="white" rx="5" ry="5" stroke="#ddd" stroke-width="1"/>
  <rect x="300" y="10" width="710" height="580" fill="white" rx="5" ry="5" stroke="#ddd" stroke-width="1"/>

  <!-- 標題區域 -->
  <text x="30" y="40" font-family="Arial" font-size="18" fill="#333">🏠</text>

  <text x="320" y="40" font-family="Arial" font-size="14" fill="#666">🏠 Home > 👥 Workspace > t21-hello_world > s2-development</text>
  <text x="320" y="60" font-family="Arial" font-size="14" fill="#666">> c01-20240121_153000.chat.json</text>

  <!-- Explorer 側邊欄 -->
  <text x="30" y="80" font-family="Arial" font-size="14" fill="#4caf50">[+ 新任務]</text>

  <text x="30" y="120" font-family="Arial" font-size="14" fill="#333">▼ workspace</text>
  <text x="45" y="140" font-family="Arial" font-size="14" fill="#333">▼ t21-hello_world 🏃 ⏸️</text>
  <text x="60" y="160" font-family="Arial" font-size="14" fill="#777">[+ 新聊天]</text>
  <text x="60" y="180" font-family="Arial" font-size="14" fill="#333">▼ s1-planning ✓ ▶️</text>
  <text x="75" y="200" font-family="Arial" font-size="14" fill="#777">[+ 新聊天]</text>
  <text x="75" y="220" font-family="Arial" font-size="14" fill="#333">💬 c01-20240121_153000..</text>
  <text x="75" y="240" font-family="Arial" font-size="14" fill="#333">💬 c02-20240121_154500..</text>

  <text x="60" y="280" font-family="Arial" font-size="14" fill="#333">▼ s2-development 🔴 🔍</text>
  <text x="75" y="300" font-family="Arial" font-size="14" fill="#777">[+ 新聊天]</text>
  <text x="75" y="320" font-family="Arial" font-size="14" fill="#333">💬 c01-20240121_153000..</text>
  <text x="75" y="340" font-family="Arial" font-size="14" fill="#0066cc">📄 navbar.v1.py</text>
  <text x="75" y="360" font-family="Arial" font-size="14" fill="#333">📄 navbar.v2.py</text>
  <text x="75" y="380" font-family="Arial" font-size="14" fill="#333">📄 api-spec.md</text>

  <text x="60" y="420" font-family="Arial" font-size="14" fill="#333">▼ s3-testing ⚠️</text>
  <text x="75" y="440" font-family="Arial" font-size="14" fill="#777">[+ 新聊天]</text>
  <text x="75" y="460" font-family="Arial" font-size="14" fill="#666">(無檔案)</text>

  <text x="60" y="500" font-family="Arial" font-size="14" fill="#333">▼ s4-deployment 📝 ▶️</text>
  <text x="75" y="520" font-family="Arial" font-size="14" fill="#777">[+ 新聊天]</text>
  <text x="75" y="540" font-family="Arial" font-size="14" fill="#666">(無檔案)</text>

  <text x="60" y="560" font-family="Arial" font-size="14" fill="#333">📄 task.json</text>

  <text x="45" y="580" font-family="Arial" font-size="14" fill="#333">► t20-feature_xyz ✓ ▶️</text>
  <text x="45" y="600" font-family="Arial" font-size="12" fill="#333">► t19-bug_fix ✓ ▶️</text>

  <text x="30" y="580" font-family="Arial" font-size="12" fill="#666">⚙️ SETTINGS</text>

  <!-- 右側聊天/預覽區域 -->
  <text x="320" y="100" font-family="Arial" font-size="14" fill="#666">[內容區域]</text>
  <text x="320" y="120" font-family="Arial" font-size="14" fill="#666"># 聊天檔案時：</text>

  <rect x="320" y="140" width="670" height="40" fill="#f5f7fa" rx="5" ry="5"/>
  <text x="330" y="165" font-family="Arial" font-size="14" fill="#333">[User] 請按照需求編寫...</text>

  <rect x="320" y="190" width="670" height="40" fill="#e6f3ff" rx="5" ry="5"/>
  <text x="330" y="215" font-family="Arial" font-size="14" fill="#333">[AI] 我已分析完需求...</text>

  <rect x="320" y="240" width="670" height="40" fill="#f5f7fa" rx="5" ry="5"/>
  <text x="330" y="265" font-family="Arial" font-size="14" fill="#333">[User] 這部分需要調整...</text>

  <rect x="320" y="290" width="670" height="40" fill="#e6f3ff" rx="5" ry="5"/>
  <text x="330" y="315" font-family="Arial" font-size="14" fill="#333">[AI] 根據反饋，我建議...</text>

  <text x="320" y="380" font-family="Arial" font-size="14" fill="#666"># 一般檔案時：</text>
  <rect x="320" y="400" width="670" height="100" fill="#f8f8f8" rx="5" ry="5" stroke="#ddd" stroke-width="1"/>
  <text x="330" y="430" font-family="Arial" font-size="14" fill="#666">[檔案內容預覽/編輯]</text>

  <!-- 分隔線 -->
  <line x1="300" y1="520" x2="1010" y2="520" stroke="#ddd" stroke-width="1"/>

  <!-- 輸入區域 -->
  <rect x="320" y="540" width="670" height="30" fill="white" rx="5" ry="5" stroke="#ddd" stroke-width="1"/>
  <text x="330" y="560" font-family="Arial" font-size="14" fill="#999">Write a message...</text>
  <text x="320" y="580" font-family="Arial" font-size="12" fill="#666">[📎附件] [發送 ➤]</text>
</svg>
```
