import React, { useState } from "react";
import { useWorkspaceTreeStore, isFolderNode } from "../../features/workspace-tree/workspace-tree-store";

const FilePreviewPanel: React.FC = () => {
  const { selectedNode } = useWorkspaceTreeStore();
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState<string>("");
  
  // Render placeholder when no file is selected
  if (!selectedNode || isFolderNode(selectedNode)) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        Select a file to view its content
      </div>
    );
  }
  
  // Get file extension
  const fileExtension = selectedNode.name.split('.').pop()?.toLowerCase() || '';
  
  // Determine syntax highlighting language based on extension
  const getLanguage = (ext: string): string => {
    const languageMap: Record<string, string> = {
      'js': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'jsx': 'javascript',
      'py': 'python',
      'md': 'markdown',
      'json': 'json',
      'html': 'html',
      'css': 'css',
      'scss': 'scss',
      'less': 'less',
    };
    
    return languageMap[ext] || 'plaintext';
  };
  
  const language = getLanguage(fileExtension);
  
  // Get path display
  const getPathDisplay = () => {
    const parts = selectedNode.path.split('/').filter(Boolean);
    
    return (
      <>
        <span className="text-gray-500">🏠 Home &gt; </span>
        {parts.map((part, index) => (
          <span key={index} className="text-gray-500">
            {index < parts.length - 1 ? `${part} > ` : part}
          </span>
        ))}
      </>
    );
  };
  
  // Handle edit toggle
  const toggleEdit = () => {
    if (isEditing) {
      // Here you would save changes
      setIsEditing(false);
    } else {
      setIsEditing(true);
    }
  };
  
  // Handle download
  const handleDownload = () => {
    // Create a blob with the content
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    // Create a temporary anchor element and trigger download
    const a = document.createElement('a');
    a.href = url;
    a.download = selectedNode.name;
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };
  
  // Handle share
  const handleShare = () => {
    // This would implement file sharing functionality
    // For MVP, just log
    console.log(`Share request for: ${selectedNode.path}`);
  };
  
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="text-sm">{getPathDisplay()}</div>
        <h2 className="text-lg font-medium mt-1">{selectedNode.name}</h2>
      </div>
      
      {/* Action buttons */}
      <div className="px-4 py-2 border-b flex">
        <button
          onClick={toggleEdit}
          className="mr-2 px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
        >
          {isEditing ? 'Save' : '✏️ Edit'}
        </button>
        
        <button
          onClick={handleDownload}
          className="mr-2 px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
        >
          ⬇️ Download
        </button>
        
        <button
          onClick={handleShare}
          className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
        >
          📤 Share
        </button>
      </div>
      
      {/* Content area */}
      <div className="flex-grow overflow-auto p-4">
        {isEditing ? (
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full h-full p-2 font-mono text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        ) : (
          <div className="bg-gray-50 p-4 border rounded h-full overflow-auto">
            <pre className={`language-${language} whitespace-pre-wrap text-sm font-mono`}>
              {/* This would display actual file content */}
              {`File content would be loaded here for: ${selectedNode.path}`}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default FilePreviewPanel;
