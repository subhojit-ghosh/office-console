import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function syncProjectMembersFromTaskAssignees() {
  const projects = await prisma.project.findMany({
    include: {
      tasks: {
        include: {
          assignees: {
            select: { id: true },
          },
        },
      },
    },
  });

  for (const project of projects) {
    const memberIds = new Set<string>();

    memberIds.add(project.createdById);

    for (const task of project.tasks) {
      for (const user of task.assignees) {
        memberIds.add(user.id);
      }
    }

    if (memberIds.size > 0) {
      const connectUsers = Array.from(memberIds).map((id) => ({ id }));

      await prisma.project.update({
        where: { id: project.id },
        data: {
          members: {
            connect: connectUsers,
          },
        },
      });

      console.log(
        `Updated project ${project.id} with ${connectUsers.length} member(s).`,
      );
    } else {
      console.log(`Project ${project.id} has no task assignees.`);
    }
  }

  console.log("✅ Sync complete.");
}

syncProjectMembersFromTaskAssignees()
  .catch((e) => {
    console.error("❌ Error:", e);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
