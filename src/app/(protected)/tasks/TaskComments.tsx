import { Space } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useRef, useState } from "react";
import { api } from "~/trpc/react";
import TaskCommentBox, { type TaskCommentBoxHandle } from "./TaskCommentBox";
import TaskCommentItem from "./TaskCommentItem";

interface TaskCommentsProps {
  taskId: string;
}

export default function TaskComments({ taskId }: TaskCommentsProps) {
  const { data: comments, refetch } = api.tasks.getComments.useQuery(
    {
      taskId,
    },
    { enabled: !!taskId },
  );
  const createCommentBoxRef = useRef<TaskCommentBoxHandle | null>(null);
  const [loading, setLoading] = useState(false);

  const createComment = api.tasks.createComment.useMutation({
    onMutate: () => {
      setLoading(true);
    },
    onSuccess: async () => {
      notifications.show({
        message: "Comment added successfully",
        color: "green",
      });
      setLoading(false);
      createCommentBoxRef.current?.clear();
      void refetch();
    },
    onError: (error) => {
      setLoading(false);
      notifications.show({
        message: error.message,
        color: "red",
      });
    },
  });

  return (
    <>
      <TaskCommentBox
        ref={createCommentBoxRef}
        loading={loading}
        onSave={(content) => {
          createComment.mutate({
            taskId,
            content,
          });
        }}
      />
      <Space h="lg" />
      {comments?.map((comment) => (
        <TaskCommentItem
          key={comment.id}
          comment={comment}
          onUpdate={() => void refetch()}
        />
      ))}
    </>
  );
}
