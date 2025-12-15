import { Button, Group } from "@mantine/core";
import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import type { AppRichTextEditorHandle } from "~/components/AppRichTextEditor";
import AppRichTextEditor from "~/components/AppRichTextEditor";

export interface TicketCommentBoxHandle {
  clear: () => void;
}

interface TicketCommentBoxProps {
  initialContent?: string;
  editMode?: boolean;
  placeholder?: string;
  loading?: boolean;
  onSave?: (value: string) => void;
  onCancel?: () => void;
}

const TicketCommentBox = forwardRef<TicketCommentBoxHandle, TicketCommentBoxProps>(
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
      editorRef.current?.editor?.commands.setContent("", { emitUpdate: false });
      editorRef.current?.setIsFocused(false);
      onCancel?.();
    };

    return (
      <>
        <AppRichTextEditor
          ref={editorRef}
          content={content}
          onUpdate={(value) => {
            setContent(value);
            setIsEditing(true);
          }}
          placeholder={placeholder}
        />
        {isEditing && (
          <Group justify="flex-end" mt="sm">
            <Button
              variant="default"
              size="xs"
              onClick={clear}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              size="xs"
              loading={loading}
              onClick={() => {
                if (content.trim()) {
                  onSave?.(content);
                }
              }}
              disabled={!content.trim() || loading}
            >
              Save
            </Button>
          </Group>
        )}
      </>
    );
  },
);

TicketCommentBox.displayName = "TicketCommentBox";

export default TicketCommentBox;
