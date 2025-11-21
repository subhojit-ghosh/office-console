import {
  ActionIcon,
  Affix,
  Tooltip,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { UserRole } from "@prisma/generated/browser";
import { IconClock } from "@tabler/icons-react";
import { useSession } from "next-auth/react";
import QuickLogModal from "~/components/QuickLogModal";

export default function QuickLogFab() {
  const { data: session } = useSession();
  const [quickLogOpened, { open: openQuickLog, close: closeQuickLog }] =
    useDisclosure(false);

  // Hide for client users
  if (
    session?.user?.role === UserRole.CLIENT_ADMIN ||
    session?.user?.role === UserRole.CLIENT_USER
  ) {
    return null;
  }

  return (
    <>
      <Affix position={{ bottom: 16, right: 16 }}>
        <Tooltip label="Quick Log Time" withArrow>
          <ActionIcon
            size="lg"
            radius="xl"
            variant="filled"
            color="violet"
            onClick={openQuickLog}
            style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}
          >
            <IconClock size={20} />
          </ActionIcon>
        </Tooltip>
      </Affix>

      <QuickLogModal opened={quickLogOpened} onClose={closeQuickLog} />
    </>
  );
}
