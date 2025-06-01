// apps/my-app-trpc/src/app/chat/add-project-folder-dialog.tsx
"use client";

import { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { Button } from "@/components/button";
import {
  Dialog,
  DialogActions,
  DialogBody,
  DialogTitle,
} from "@/components/dialog";
import { Input, Label } from "@/components/input";
import { trpc } from "@/lib/trpc-client";

interface AddProjectFolderDialogProps {
  open: boolean;
  onClose: () => void;
}

export function AddProjectFolderDialog({
  open,
  onClose,
}: AddProjectFolderDialogProps) {
  const [folderPath, setFolderPath] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const utils = trpc.useUtils();
  const addProjectFolder = trpc.projectFolder.addProjectFolder.useMutation({
    onSuccess: () => {
      utils.projectFolder.getAllProjectFolders.invalidate();
      onClose();
      setFolderPath("");
    },
    onError: (error) => {
      alert("Error adding project folder: " + error.message);
    },
    onSettled: () => {
      setIsLoading(false);
    },
  });

  const handleSelectFolder = async () => {
    try {
      // Use the File System Access API if available (modern browsers)
      if ("showDirectoryPicker" in window) {
        const dirHandle = await (window as any).showDirectoryPicker();
        setFolderPath(dirHandle.name || "Selected Folder");
        // Store the actual path in a data attribute or state
        // Note: File System Access API doesn't give full paths for security
      } else {
        // Fallback: ask user to input path manually
        const path = prompt(
          "Please enter the full path to your project folder:"
        );
        if (path) {
          setFolderPath(path);
        }
      }
    } catch (error) {
      console.log("User cancelled folder selection");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderPath.trim()) return;

    setIsLoading(true);
    addProjectFolder.mutate({
      projectFolderPath: folderPath.trim(),
      correlationId: uuidv4(),
    });
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Add Project Folder</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogBody>
          <div className="space-y-4">
            <div>
              <Label className="text-sm/6 font-medium">Folder Path</Label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={folderPath}
                  onChange={(e) => setFolderPath(e.target.value)}
                  placeholder="/path/to/your/project"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSelectFolder}
                >
                  Browse
                </Button>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Select a folder to add to your workspace. All files in this
                folder will be monitored for changes.
              </p>
            </div>
          </div>
        </DialogBody>
        <DialogActions>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={!folderPath.trim() || isLoading}>
            {isLoading ? "Adding..." : "Add Folder"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
