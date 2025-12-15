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
import TicketCommentBox from "./TicketCommentBox";

interface TicketCommentItemProps {
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

export default function TicketCommentItem({
  comment,
  onUpdate,
}: TicketCommentItemProps) {
  const { data: session } = useSession();
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [loading, setLoading] = useState(false);

  const deleteComment = api.tickets.deleteComment.useMutation({
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

  const updateComment = api.tickets.updateComment.useMutation({
    onMutate: () => {
      setLoading(true);
    },
    onSuccess: async () => {
      setLoading(false);
      setMode("view");
      onUpdate?.();
      notifications.show({
        message: "Comment updated successfully",
        color: "green",
      });
    },
    onError: (error) => {
      setLoading(false);
      notifications.show({
        message: error.message,
        color: "red",
      });
    },
  });

  const handleDelete = () => {
    modals.openConfirmModal({
      title: "Delete Comment",
      children: (
        <Text size="sm">
          Are you sure you want to delete this comment? This action cannot be undone.
        </Text>
      ),
      labels: { confirm: "Delete", cancel: "Cancel" },
      confirmProps: { color: "red" },
      onConfirm: () => {
        deleteComment.mutate({ id: comment.id });
      },
    });
  };

  const isOwnComment = session?.user?.id === comment.user.id;

  if (mode === "edit") {
    return (
      <Box p="md" style={{ border: "1px solid var(--mantine-color-gray-3)", borderRadius: "var(--mantine-radius-sm)" }}>
        <TicketCommentBox
          initialContent={comment.content}
          editMode
          loading={loading}
          placeholder="Update comment..."
          onSave={(content) => {
            updateComment.mutate({
              id: comment.id,
              content,
            });
          }}
          onCancel={() => setMode("view")}
        />
      </Box>
    );
  }

  return (
    <Grid align="flex-start" mb="lg">
      <Grid.Col span="content">
        <Avatar size="sm" name={comment.user.name} />
      </Grid.Col>
      <Grid.Col span="auto">
        <Group justify="space-between" mb="xs">
          <Group gap="xs">
            <Text size="sm" fw={500}>
              {comment.user.name}
            </Text>
            <Text size="xs" c="dimmed">
              {dayjs(comment.createdAt).format("MMM D, YYYY [at] h:mm A")}
              {comment.edited && " (edited)"}
            </Text>
          </Group>
          {isOwnComment && (
            <Group gap="xs">
              <Tooltip label="Edit comment">
                <ActionIcon
                  size="xs"
                  variant="subtle"
                  onClick={() => setMode("edit")}
                >
                  <IconEdit size={14} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="Delete comment">
                <ActionIcon
                  size="xs"
                  variant="subtle"
                  color="red"
                  onClick={handleDelete}
                >
                  <IconTrash size={14} />
                </ActionIcon>
              </Tooltip>
            </Group>
          )}
        </Group>
        <Box
          style={{
            padding: "var(--mantine-spacing-xs)",
            backgroundColor: "var(--mantine-color-gray-0)",
            borderRadius: "var(--mantine-radius-sm)",
          }}
          dangerouslySetInnerHTML={{ __html: comment.content }}
        />
      </Grid.Col>
    </Grid>
  );
}
