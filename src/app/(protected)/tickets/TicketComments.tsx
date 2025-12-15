import { Space } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useEffect, useRef, useState } from "react";
import { api } from "~/trpc/react";
import TicketCommentBox, { type TicketCommentBoxHandle } from "./TicketCommentBox";
import TicketCommentItem from "./TicketCommentItem";

interface TicketCommentsProps {
  ticketId: string;
  onCountChange?: (count: number) => void;
}

export default function TicketComments({
  ticketId,
  onCountChange,
}: TicketCommentsProps) {
  const { data: comments, refetch } = api.tickets.getComments.useQuery(
    {
      ticketId,
    },
    { enabled: !!ticketId },
  );
  const createCommentBoxRef = useRef<TicketCommentBoxHandle | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (comments && onCountChange) {
      onCountChange(comments.length);
    }
  }, [comments, onCountChange]);

  const createComment = api.tickets.createComment.useMutation({
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
      <TicketCommentBox
        ref={createCommentBoxRef}
        loading={loading}
        onSave={(content) => {
          createComment.mutate({
            ticketId,
            content,
          });
        }}
      />
      <Space h="lg" />
      {comments?.map((comment) => (
        <TicketCommentItem
          key={comment.id}
          comment={comment}
          onUpdate={() => void refetch()}
        />
      ))}
    </>
  );
}
