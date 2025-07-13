import {
  ActionIcon,
  Avatar,
  Box,
  Grid,
  Group,
  Text,
  Tooltip,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { IconEdit, IconTrash } from "@tabler/icons-react";
import dayjs from "dayjs";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { api } from "~/trpc/react";
import TaskCommentBox from "./TaskCommentBox";

interface TaskCommentItemProps {
  comment: {
    id: string;
    content: string;
    createdAt: Date;
    updatedAt: Date | null;
    user: {
      id: string;
      name: string;
    };
    edited: boolean;
  };
  onUpdate?: () => void;
}

export default function TaskCommentItem({
  comment,
  onUpdate,
}: TaskCommentItemProps) {
  const { data: session } = useSession();
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [loading, setLoading] = useState(false);

  const deleteComment = api.tasks.deleteComment.useMutation({
    onSuccess: async () => {
      onUpdate?.();
      notifications.show({
        message: "Comment deleted successfully",
        color: "green",
      });
    },
    onError: (error) => {
      notifications.show({
        message: error.message,
        color: "red",
      });
    },
  });

  const updateComment = api.tasks.updateComment.useMutation({
    onMutate: () => {
      setLoading(true);
    },
    onSuccess: async () => {
      onUpdate?.();
      notifications.show({
        message: "Comment updated successfully",
        color: "green",
      });
      setLoading(false);
      setMode("view");
    },
    onError: (error) => {
      notifications.show({
        message: error.message,
        color: "red",
      });
      setLoading(false);
    },
  });

  const remove = () => {
    modals.openConfirmModal({
      title: "Delete Comment",
      children: (
        <Box>Are you sure you want to delete? This cannot be undone.</Box>
      ),
      labels: { confirm: "Delete", cancel: "Cancel" },
      confirmProps: { color: "red" },
      onConfirm: () => {
        deleteComment.mutate({ id: comment.id });
      },
    });
  };

  return (
    <Grid key={comment.id} align="flex-start">
      <Grid.Col span="content">
        <Avatar size="sm" name={comment.user.name} />
      </Grid.Col>

      <Grid.Col span="auto">
        <Group justify="space-between" align="start">
          <Text size="sm" fw={500}>
            {comment.user.name}
          </Text>

          {session?.user.id === comment.user.id && mode === "view" && (
            <Group gap={4}>
              <Tooltip label="Edit" withArrow>
                <ActionIcon
                  size="sm"
                  color="gray"
                  variant="subtle"
                  onClick={() => setMode("edit")}
                >
                  <IconEdit size={16} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="Delete" withArrow>
                <ActionIcon
                  size="sm"
                  color="gray"
                  variant="subtle"
                  onClick={remove}
                >
                  <IconTrash size={16} />
                </ActionIcon>
              </Tooltip>
            </Group>
          )}
        </Group>

        <Text size="xs" c="dimmed">
          {dayjs(comment.updatedAt ?? comment.createdAt).format(
            "MMMM D, YYYY [at] h:mm A",
          )}
          {comment.edited && <em style={{ marginLeft: 4 }}>(edited)</em>}
        </Text>

        {mode === "view" ? (
          <div
            dangerouslySetInnerHTML={{ __html: comment.content }}
            style={{ marginTop: "5px" }}
            className="rich-text-content"
          ></div>
        ) : (
          <div style={{ marginTop: "5px" }}>
            <TaskCommentBox
              initialContent={comment.content}
              editMode={true}
              onCancel={() => setMode("view")}
              loading={loading}
              onSave={(content) => {
                comment.content = content;
                updateComment.mutate({
                  id: comment.id,
                  content,
                });
              }}
            />
          </div>
        )}
      </Grid.Col>
    </Grid>
  );
}
