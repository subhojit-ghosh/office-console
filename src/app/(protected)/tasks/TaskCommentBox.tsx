import { Button, Group } from "@mantine/core";
import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import type { AppRichTextEditorHandle } from "~/components/AppRichTextEditor";
import AppRichTextEditor from "~/components/AppRichTextEditor";

export interface TaskCommentBoxHandle {
  clear: () => void;
}

interface TaskCommentBoxProps {
  initialContent?: string;
  editMode?: boolean;
  placeholder?: string;
  loading?: boolean;
  onSave?: (value: string) => void;
  onCancel?: () => void;
}

const TaskCommentBox = forwardRef<TaskCommentBoxHandle, TaskCommentBoxProps>(
  (
    {
      initialContent = "",
      placeholder = "Add a comment...",
      loading = false,
      editMode = false,
      onSave,
      onCancel,
    },
    ref,
  ) => {
    const [content, setContent] = useState(initialContent);
    const [isEditing, setIsEditing] = useState(editMode);
    const editorRef = useRef<AppRichTextEditorHandle | null>(null);

    useImperativeHandle(ref, () => ({
      clear: () => {
        clear();
      },
    }));

    const clear = () => {
      setIsEditing(false);
      setContent("");
      editorRef.current?.editor?.commands.setContent("", false);
      editorRef.current?.setIsFocused(false);
      onCancel?.();
    };

    return (
      <>
        <AppRichTextEditor
          ref={editorRef}
          minimal={true}
          placeholder={placeholder}
          content={content}
          alwaysActive={editMode}
          isOneTimeActive={true}
          onUpdate={(value) => setContent(value)}
          onFocusChange={(focused) => setIsEditing(focused)}
        />
        {isEditing && (
          <Group mt="xs" gap="xs">
            <Button
              size="xs"
              onClick={() => {
                onSave?.(content);
              }}
              disabled={loading || editorRef.current?.editor?.isEmpty}
              loading={loading}
            >
              Save
            </Button>
            <Button
              size="xs"
              color="gray"
              variant="subtle"
              onClick={clear}
              disabled={loading}
            >
              Cancel
            </Button>
          </Group>
        )}
      </>
    );
  },
);

TaskCommentBox.displayName = "TaskCommentBox";

export default TaskCommentBox;
