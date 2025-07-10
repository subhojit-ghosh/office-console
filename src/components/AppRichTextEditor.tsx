import {
  getTaskListExtension,
  Link,
  RichTextEditor,
  useRichTextEditorContext,
} from "@mantine/tiptap";
import {
  IconColumnInsertRight,
  IconRowInsertBottom,
  IconTableMinus,
  IconTablePlus,
} from "@tabler/icons-react";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import Placeholder from "@tiptap/extension-placeholder";
import SubScript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import Table from "@tiptap/extension-table";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import TableRow from "@tiptap/extension-table-row";
import TaskItem from "@tiptap/extension-task-item";
import TipTapTaskList from "@tiptap/extension-task-list";
import TextAlign from "@tiptap/extension-text-align";
import TextStyle from "@tiptap/extension-text-style";
import Underline from "@tiptap/extension-underline";
import { type Editor, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { forwardRef, useEffect, useImperativeHandle, useState } from "react";

interface Props {
  id?: string | number;
  content?: string;
  onUpdate?: (value: string) => void;
  minimal?: boolean;
  placeholder?: string;
  isOneTimeActive?: boolean;
  alwaysActive?: boolean;
  onFocusChange?: (isFocused: boolean) => void;
}

export interface AppRichTextEditorHandle {
  editor: Editor | null;
  setIsFocused: (value: boolean) => void;
}

const AppRichTextEditor = forwardRef<AppRichTextEditorHandle, Props>(
  (props, ref) => {
    const [isFocused, setIsFocused] = useState(false);

    const editor = useEditor({
      immediatelyRender: false,
      extensions: [
        StarterKit,
        Underline,
        Link,
        Superscript,
        SubScript,
        Highlight,
        TextAlign,
        Color,
        TextStyle,
        ...(props.placeholder
          ? [Placeholder.configure({ placeholder: props.placeholder })]
          : []),
        getTaskListExtension(TipTapTaskList),
        TaskItem.configure({
          nested: true,
          HTMLAttributes: {
            class: "test-item",
          },
        }),
        Table.configure({
          resizable: true,
          HTMLAttributes: {
            class: "table-auto border border-collapse",
          },
        }),
        TableRow,
        TableHeader,
        TableCell,
      ],
      content: props.content,
      onUpdate: (instance) => {
        const content = instance.editor.getHTML();
        if (props.onUpdate) {
          props.onUpdate(content);
        }
      },
      onFocus: () => {
        setIsFocused(true);
        if (props.onFocusChange) {
          props.onFocusChange(true);
        }
      },
      onBlur: () => {
        if (props.isOneTimeActive && isFocused) return;

        setIsFocused(false);
        if (props.onFocusChange) {
          props.onFocusChange(false);
        }
      },
    });

    useEffect(() => {
      editor?.commands.setContent(props.content ?? "", false);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [props.id]);

    useImperativeHandle(ref, () => ({
      setIsFocused: (value) => setIsFocused(value),
      editor: editor ?? null,
    }));

    return (
      <RichTextEditor editor={editor}>
        {(isFocused || props.alwaysActive) && (
          <RichTextEditor.Toolbar>
            <RichTextEditor.ControlsGroup>
              <RichTextEditor.Bold />
              <RichTextEditor.Italic />
              <RichTextEditor.Underline />
              <RichTextEditor.Strikethrough />
              <RichTextEditor.ClearFormatting />
              <RichTextEditor.Highlight />
              <RichTextEditor.Code />
            </RichTextEditor.ControlsGroup>

            {!props.minimal && (
              <RichTextEditor.ControlsGroup>
                <RichTextEditor.H1 />
                <RichTextEditor.H2 />
                <RichTextEditor.H3 />
                <RichTextEditor.H4 />
              </RichTextEditor.ControlsGroup>
            )}

            {!props.minimal && (
              <RichTextEditor.ControlsGroup>
                <RichTextEditor.Blockquote />
                <RichTextEditor.Hr />
                <RichTextEditor.BulletList />
                <RichTextEditor.OrderedList />
                <RichTextEditor.Subscript />
                <RichTextEditor.Superscript />
              </RichTextEditor.ControlsGroup>
            )}

            <RichTextEditor.ControlsGroup>
              <RichTextEditor.Link />
              <RichTextEditor.Unlink />
            </RichTextEditor.ControlsGroup>

            {!props.minimal && (
              <RichTextEditor.ControlsGroup>
                <RichTextEditor.AlignLeft />
                <RichTextEditor.AlignCenter />
                <RichTextEditor.AlignJustify />
                <RichTextEditor.AlignRight />
              </RichTextEditor.ControlsGroup>
            )}

            {!props.minimal && (
              <RichTextEditor.ControlsGroup>
                <RichTextEditor.TaskList />
                <RichTextEditor.TaskListLift />
                <RichTextEditor.TaskListSink />
              </RichTextEditor.ControlsGroup>
            )}

            {!props.minimal && (
              <RichTextEditor.ControlsGroup>
                <TableButtons />
              </RichTextEditor.ControlsGroup>
            )}

            <RichTextEditor.ControlsGroup>
              <RichTextEditor.Undo />
              <RichTextEditor.Redo />
            </RichTextEditor.ControlsGroup>
          </RichTextEditor.Toolbar>
        )}

        <RichTextEditor.Content />
      </RichTextEditor>
    );
  },
);

AppRichTextEditor.displayName = "AppRichTextEditor";

function TableButtons() {
  const { editor } = useRichTextEditorContext();

  if (!editor) return null;

  return (
    <>
      <RichTextEditor.Control
        onClick={() =>
          editor
            .chain()
            .focus()
            .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
            .run()
        }
        title="Insert table"
      >
        <IconTablePlus stroke={1.5} size={16} />
      </RichTextEditor.Control>
      <RichTextEditor.Control
        onClick={() => editor.chain().focus().addColumnAfter().run()}
        title="Add column"
      >
        <IconColumnInsertRight stroke={1.5} size={16} />
      </RichTextEditor.Control>
      <RichTextEditor.Control
        onClick={() => editor.chain().focus().addRowAfter().run()}
        title="Add row"
      >
        <IconRowInsertBottom stroke={1.5} size={16} />
      </RichTextEditor.Control>
      <RichTextEditor.Control
        onClick={() => editor.chain().focus().deleteTable().run()}
        title="Delete table"
      >
        <IconTableMinus stroke={1.5} size={16} />
      </RichTextEditor.Control>
    </>
  );
}

export default AppRichTextEditor;
