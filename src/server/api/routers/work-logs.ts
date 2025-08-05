import type { Prisma } from "@prisma/client";
import {
  createWotkLogSchema,
  deleteWorkLogSchema,
  getWorkLogsSchema,
} from "~/schemas/work-log.schema";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { z } from "zod";
import { UserRole } from "@prisma/client";

// Type definitions for hierarchical structure
type WorkLogWithHierarchy = {
  id: string;
  note: string | null;
  startTime: Date;
  endTime: Date;
  durationMin: number;
  clientAdjustedDurationMin: number;
  user: {
    id: string;
    name: string;
  };
  task: {
    id: string;
    title: string;
    type: string;
    module: {
      id: string;
      name: string;
      project: {
        id: string;
        name: string;
      };
    } | null;
    project: {
      id: string;
      name: string;
    };
  };
};

type TaskData = {
  id: string;
  title: string;
  type: string;
  moduleId: string;
  workLogs: WorkLogWithHierarchy[];
  totalDuration: number;
};

type ModuleData = {
  id: string;
  name: string;
  projectId: string;
  tasks: TaskData[];
  totalDuration: number;
  totalWorkLogs: number;
};

type ProjectData = {
  id: string;
  name: string;
  modules: ModuleData[];
  totalDuration: number;
  totalWorkLogs: number;
};

export const workLogsRouter = createTRPCRouter({
  getAll: protectedProcedure
    .input(getWorkLogsSchema)
    .query(async ({ ctx, input }) => {
      const where: Prisma.WorkLogWhereInput = {
        ...(input.taskId ? { taskId: input.taskId } : {}),
        ...(input.userId ? { userId: input.userId } : {}),
      };

      return ctx.db.workLog.findMany({
        where,
        orderBy: { startTime: "desc" },
        select: {
          id: true,
          note: true,
          startTime: true,
          endTime: true,
          durationMin: true,
          clientAdjustedDurationMin: true,
          user: {
            select: {
              id: true,
              name: true,
            },
          },
          task: {
            select: {
              id: true,
              title: true,
              type: true,
            },
          },
        },
      });
    }),

  // Get projects with work log summaries
  getProjects: protectedProcedure
    .input(z.object({
      dateRange: z.tuple([z.date().nullable(), z.date().nullable()]).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const clientId = ctx.session.user.clientId;

      // Apply the same filtering logic as projects router
      const projectWhere: Prisma.ProjectWhereInput = {
        ...(clientId ? { clientId } : {}),
        ...(ctx.session.user.role === UserRole.STAFF
          ? {
              OR: [
                { createdById: ctx.session.user.id },
                {
                  members: {
                    some: { id: ctx.session.user.id },
                  },
                },
              ],
            }
          : {}),
      };

      // First, get all projects based on user permissions
      const allProjects = await ctx.db.project.findMany({
        where: projectWhere,
        select: {
          id: true,
          name: true,
        },
        orderBy: { name: 'asc' },
      });

      // Then, get work log data for filtering
      const workLogWhere: Prisma.WorkLogWhereInput = {
        ...(input.dateRange?.[0] && input.dateRange?.[1] ? {
          startTime: {
            gte: input.dateRange[0],
            lte: input.dateRange[1],
          },
        } : {}),
      };

      const workLogs = await ctx.db.workLog.findMany({
        where: workLogWhere,
        select: {
          durationMin: true,
          startTime: true,
          task: {
            select: {
              projectId: true,
            },
          },
        },
      });

      // Create a map of project work log data
      const projectWorkLogMap = new Map<string, { 
        totalDuration: number; 
        totalWorkLogs: number;
        firstWorkLogDate: Date | null;
        lastWorkLogDate: Date | null;
      }>();
      
      for (const workLog of workLogs) {
        if (workLog.task?.projectId) {
          const projectId = workLog.task.projectId;
          
          if (!projectWorkLogMap.has(projectId)) {
            projectWorkLogMap.set(projectId, {
              totalDuration: 0,
              totalWorkLogs: 0,
              firstWorkLogDate: null,
              lastWorkLogDate: null,
            });
          }
          
          const projectData = projectWorkLogMap.get(projectId)!;
          projectData.totalDuration += workLog.durationMin;
          projectData.totalWorkLogs += 1;
          
          // Track first and last work log dates
          if (!projectData.firstWorkLogDate || workLog.startTime < projectData.firstWorkLogDate) {
            projectData.firstWorkLogDate = workLog.startTime;
          }
          if (!projectData.lastWorkLogDate || workLog.startTime > projectData.lastWorkLogDate) {
            projectData.lastWorkLogDate = workLog.startTime;
          }
        }
      }

      // If date range is applied, only return projects that have work logs in that range
      if (input.dateRange?.[0] && input.dateRange?.[1]) {
        return allProjects
          .filter(project => projectWorkLogMap.has(project.id))
          .map(project => {
            const workLogData = projectWorkLogMap.get(project.id)!;
            return {
              id: project.id,
              name: project.name,
              totalDuration: workLogData.totalDuration,
              totalWorkLogs: workLogData.totalWorkLogs,
              firstWorkLogDate: workLogData.firstWorkLogDate,
              lastWorkLogDate: workLogData.lastWorkLogDate,
            };
          });
      }

      // If no date range, return all projects with their work log data
      return allProjects.map(project => {
        const workLogData = projectWorkLogMap.get(project.id) ?? { 
          totalDuration: 0, 
          totalWorkLogs: 0,
          firstWorkLogDate: null,
          lastWorkLogDate: null,
        };
        return {
          id: project.id,
          name: project.name,
          totalDuration: workLogData.totalDuration,
          totalWorkLogs: workLogData.totalWorkLogs,
          firstWorkLogDate: workLogData.firstWorkLogDate,
          lastWorkLogDate: workLogData.lastWorkLogDate,
        };
      });
    }),

  // Get modules for a specific project
  getModules: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      dateRange: z.tuple([z.date().nullable(), z.date().nullable()]).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const clientId = ctx.session.user.clientId;

      // Apply the same filtering logic as projects router to verify user has access to this project
      const projectWhere: Prisma.ProjectWhereInput = {
        id: input.projectId,
        ...(clientId ? { clientId } : {}),
        ...(ctx.session.user.role === UserRole.STAFF
          ? {
              OR: [
                { createdById: ctx.session.user.id },
                {
                  members: {
                    some: { id: ctx.session.user.id },
                  },
                },
              ],
            }
          : {}),
      };

      // Verify user has access to this project
      const project = await ctx.db.project.findFirst({
        where: projectWhere,
        select: { id: true },
      });

      if (!project) {
        throw new Error("Project not found or access denied");
      }

      // First, get all modules for the project
      const allModules = await ctx.db.module.findMany({
        where: { projectId: input.projectId },
        select: {
          id: true,
          name: true,
        },
        orderBy: { name: 'asc' },
      });

      // Then, get work log data for filtering
      const workLogWhere: Prisma.WorkLogWhereInput = {
        ...(input.dateRange?.[0] && input.dateRange?.[1] ? {
          startTime: {
            gte: input.dateRange[0],
            lte: input.dateRange[1],
          },
        } : {}),
        task: {
          projectId: input.projectId,
        },
      };

      const workLogs = await ctx.db.workLog.findMany({
        where: workLogWhere,
        select: {
          durationMin: true,
          startTime: true,
          task: {
            select: {
              moduleId: true,
            },
          },
        },
      });

      // Create a map of module work log data
      const moduleWorkLogMap = new Map<string, { 
        totalDuration: number; 
        totalWorkLogs: number;
        firstWorkLogDate: Date | null;
        lastWorkLogDate: Date | null;
      }>();
      
      for (const workLog of workLogs) {
        const moduleId = workLog.task?.moduleId ?? `no-module-${input.projectId}`;
        
        if (!moduleWorkLogMap.has(moduleId)) {
          moduleWorkLogMap.set(moduleId, {
            totalDuration: 0,
            totalWorkLogs: 0,
            firstWorkLogDate: null,
            lastWorkLogDate: null,
          });
        }
        
        const moduleData = moduleWorkLogMap.get(moduleId)!;
        moduleData.totalDuration += workLog.durationMin;
        moduleData.totalWorkLogs += 1;
        
        // Track first and last work log dates
        if (!moduleData.firstWorkLogDate || workLog.startTime < moduleData.firstWorkLogDate) {
          moduleData.firstWorkLogDate = workLog.startTime;
        }
        if (!moduleData.lastWorkLogDate || workLog.startTime > moduleData.lastWorkLogDate) {
          moduleData.lastWorkLogDate = workLog.startTime;
        }
      }

      // If date range is applied, only return modules that have work logs in that range
      if (input.dateRange?.[0] && input.dateRange?.[1]) {
        const modulesWithData = allModules
          .filter(module => moduleWorkLogMap.has(module.id))
          .map(module => {
            const workLogData = moduleWorkLogMap.get(module.id)!;
            return {
              id: module.id,
              name: module.name,
              projectId: input.projectId,
              totalDuration: workLogData.totalDuration,
              totalWorkLogs: workLogData.totalWorkLogs,
              firstWorkLogDate: workLogData.firstWorkLogDate,
              lastWorkLogDate: workLogData.lastWorkLogDate,
            };
          });

        // Add "No Module" entry if there are work logs without modules
        const noModuleData = moduleWorkLogMap.get(`no-module-${input.projectId}`);
        if (noModuleData && noModuleData.totalWorkLogs > 0) {
          modulesWithData.push({
            id: `no-module-${input.projectId}`,
            name: 'No Module',
            projectId: input.projectId,
            totalDuration: noModuleData.totalDuration,
            totalWorkLogs: noModuleData.totalWorkLogs,
            firstWorkLogDate: noModuleData.firstWorkLogDate,
            lastWorkLogDate: noModuleData.lastWorkLogDate,
          });
        }

        return modulesWithData;
      }

      // If no date range, return all modules with their work log data
      const modulesWithData = allModules.map(module => {
        const workLogData = moduleWorkLogMap.get(module.id) ?? { 
          totalDuration: 0, 
          totalWorkLogs: 0,
          firstWorkLogDate: null,
          lastWorkLogDate: null,
        };
        return {
          id: module.id,
          name: module.name,
          projectId: input.projectId,
          totalDuration: workLogData.totalDuration,
          totalWorkLogs: workLogData.totalWorkLogs,
          firstWorkLogDate: workLogData.firstWorkLogDate,
          lastWorkLogDate: workLogData.lastWorkLogDate,
        };
      });

      // Add "No Module" entry if there are work logs without modules
      const noModuleData = moduleWorkLogMap.get(`no-module-${input.projectId}`);
      if (noModuleData && noModuleData.totalWorkLogs > 0) {
        modulesWithData.push({
          id: `no-module-${input.projectId}`,
          name: 'No Module',
          projectId: input.projectId,
          totalDuration: noModuleData.totalDuration,
          totalWorkLogs: noModuleData.totalWorkLogs,
          firstWorkLogDate: noModuleData.firstWorkLogDate,
          lastWorkLogDate: noModuleData.lastWorkLogDate,
        });
      }

      return modulesWithData;
    }),

  // Get tasks for a specific module
  getTasks: protectedProcedure
    .input(z.object({
      moduleId: z.string(),
      projectId: z.string(),
      dateRange: z.tuple([z.date().nullable(), z.date().nullable()]).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const clientId = ctx.session.user.clientId;

      // Apply the same filtering logic as projects router to verify user has access to this project
      const projectWhere: Prisma.ProjectWhereInput = {
        id: input.projectId,
        ...(clientId ? { clientId } : {}),
        ...(ctx.session.user.role === UserRole.STAFF
          ? {
              OR: [
                { createdById: ctx.session.user.id },
                {
                  members: {
                    some: { id: ctx.session.user.id },
                  },
                },
              ],
            }
          : {}),
      };

      // Verify user has access to this project
      const project = await ctx.db.project.findFirst({
        where: projectWhere,
        select: { id: true },
      });

      if (!project) {
        throw new Error("Project not found or access denied");
      }

      // First, get all tasks for the module/project
      const taskWhere = input.moduleId.startsWith('no-module-') 
        ? { projectId: input.projectId, moduleId: null }
        : { projectId: input.projectId, moduleId: input.moduleId };

      const allTasks = await ctx.db.task.findMany({
        where: taskWhere,
        select: {
          id: true,
          title: true,
          type: true,
        },
        orderBy: { title: 'asc' },
      });

      // Then, get work log data for filtering
      const workLogWhere: Prisma.WorkLogWhereInput = {
        ...(input.dateRange?.[0] && input.dateRange?.[1] ? {
          startTime: {
            gte: input.dateRange[0],
            lte: input.dateRange[1],
          },
        } : {}),
        task: {
          projectId: input.projectId,
          ...(input.moduleId.startsWith('no-module-') ? { moduleId: null } : { moduleId: input.moduleId }),
        },
      };

      const workLogs = await ctx.db.workLog.findMany({
        where: workLogWhere,
        select: {
          durationMin: true,
          startTime: true,
          taskId: true,
        },
      });

      // Create a map of task work log data
      const taskWorkLogMap = new Map<string, { 
        totalDuration: number; 
        totalWorkLogs: number;
        firstWorkLogDate: Date | null;
        lastWorkLogDate: Date | null;
      }>();
      
      for (const workLog of workLogs) {
        const taskId = workLog.taskId;
        
        if (taskId && !taskWorkLogMap.has(taskId)) {
          taskWorkLogMap.set(taskId, {
            totalDuration: 0,
            totalWorkLogs: 0,
            firstWorkLogDate: null,
            lastWorkLogDate: null,
          });
        }
        
        if (taskId) {
          const taskData = taskWorkLogMap.get(taskId)!;
          taskData.totalDuration += workLog.durationMin;
          taskData.totalWorkLogs += 1;
          
          // Track first and last work log dates
          if (!taskData.firstWorkLogDate || workLog.startTime < taskData.firstWorkLogDate) {
            taskData.firstWorkLogDate = workLog.startTime;
          }
          if (!taskData.lastWorkLogDate || workLog.startTime > taskData.lastWorkLogDate) {
            taskData.lastWorkLogDate = workLog.startTime;
          }
        }
      }

      // If date range is applied, only return tasks that have work logs in that range
      if (input.dateRange?.[0] && input.dateRange?.[1]) {
        return allTasks
          .filter(task => taskWorkLogMap.has(task.id))
          .map(task => {
            const workLogData = taskWorkLogMap.get(task.id)!;
            return {
              id: task.id,
              title: task.title,
              type: task.type,
              moduleId: input.moduleId,
              totalDuration: workLogData.totalDuration,
              totalWorkLogs: workLogData.totalWorkLogs,
              firstWorkLogDate: workLogData.firstWorkLogDate,
              lastWorkLogDate: workLogData.lastWorkLogDate,
            };
          });
      }

      // If no date range, return all tasks with their work log data
      return allTasks.map(task => {
        const workLogData = taskWorkLogMap.get(task.id) ?? { 
          totalDuration: 0, 
          totalWorkLogs: 0,
          firstWorkLogDate: null,
          lastWorkLogDate: null,
        };
        return {
          id: task.id,
          title: task.title,
          type: task.type,
          moduleId: input.moduleId,
          totalDuration: workLogData.totalDuration,
          totalWorkLogs: workLogData.totalWorkLogs,
          firstWorkLogDate: workLogData.firstWorkLogDate,
          lastWorkLogDate: workLogData.lastWorkLogDate,
        };
      });
    }),

  // Get work logs for a specific task
  getWorkLogs: protectedProcedure
    .input(z.object({
      taskId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const clientId = ctx.session.user.clientId;

      // First, verify user has access to the task's project
      const task = await ctx.db.task.findUnique({
        where: { id: input.taskId },
        select: {
          projectId: true,
          project: {
            select: {
              clientId: true,
              createdById: true,
              members: {
                select: { id: true },
              },
            },
          },
        },
      });

      if (!task) {
        throw new Error("Task not found");
      }

      // Apply the same filtering logic as projects router to verify user has access to this project
      const hasAccess = 
        // Admin/Manager can access all projects
        ctx.session.user.role !== UserRole.STAFF ||
        // Staff can only access projects they created or are members of
        (ctx.session.user.role === UserRole.STAFF && (
          task.project.createdById === ctx.session.user.id ||
          task.project.members.some(member => member.id === ctx.session.user.id)
        )) &&
        // User's client must match project's client (if user has a client)
        (!clientId || task.project.clientId === clientId);

      if (!hasAccess) {
        throw new Error("Access denied to this task");
      }

      const where: Prisma.WorkLogWhereInput = {
        taskId: input.taskId,
      };

      return ctx.db.workLog.findMany({
        where,
        orderBy: { startTime: "desc" },
        select: {
          id: true,
          note: true,
          startTime: true,
          endTime: true,
          durationMin: true,
          clientAdjustedDurationMin: true,
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });
    }),

  getHierarchical: protectedProcedure
    .input(getWorkLogsSchema)
    .query(async ({ ctx, input }): Promise<ProjectData[]> => {
      const where: Prisma.WorkLogWhereInput = {
        ...(input.taskId ? { taskId: input.taskId } : {}),
        ...(input.userId ? { userId: input.userId } : {}),
      };

      // Get all work logs with full hierarchy
      const workLogs = await ctx.db.workLog.findMany({
        where,
        orderBy: { startTime: "desc" },
        select: {
          id: true,
          note: true,
          startTime: true,
          endTime: true,
          durationMin: true,
          clientAdjustedDurationMin: true,
          user: {
            select: {
              id: true,
              name: true,
            },
          },
          task: {
            select: {
              id: true,
              title: true,
              type: true,
              module: {
                select: {
                  id: true,
                  name: true,
                  project: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
              project: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      }) as WorkLogWithHierarchy[];

      // Group by project
      const projectsMap = new Map<string, ProjectData>();
      
      workLogs.forEach((workLog) => {
        const projectId = workLog.task?.project?.id;
        const projectName = workLog.task?.project?.name;
        
        if (!projectId || !projectName) return;
        
        if (!projectsMap.has(projectId)) {
          projectsMap.set(projectId, {
            id: projectId,
            name: projectName,
            modules: [],
            totalDuration: 0,
            totalWorkLogs: 0,
          });
        }
        
        const project = projectsMap.get(projectId)!;
        project.totalDuration += workLog.durationMin;
        project.totalWorkLogs += 1;
        
        // Group by module
        const moduleId = workLog.task?.module?.id;
        const moduleName = workLog.task?.module?.name;
        
        if (moduleId && moduleName) {
          let moduleData = project.modules.find(m => m.id === moduleId);
          
          if (!moduleData) {
            moduleData = {
              id: moduleId,
              name: moduleName,
              projectId,
              tasks: [],
              totalDuration: 0,
              totalWorkLogs: 0,
            };
            project.modules.push(moduleData);
          }
          
          moduleData.totalDuration += workLog.durationMin;
          moduleData.totalWorkLogs += 1;
          
          // Group by task
          const taskId = workLog.task?.id;
          const taskTitle = workLog.task?.title;
          const taskType = workLog.task?.type;
          
          if (taskId && taskTitle) {
            let task = moduleData.tasks.find(t => t.id === taskId);
            
            if (!task) {
              task = {
                id: taskId,
                title: taskTitle,
                type: taskType,
                moduleId,
                workLogs: [],
                totalDuration: 0,
              };
              moduleData.tasks.push(task);
            }
            
            task.workLogs.push(workLog);
            task.totalDuration += workLog.durationMin;
          }
        } else {
          // Task without module
          const taskId = workLog.task?.id;
          const taskTitle = workLog.task?.title;
          const taskType = workLog.task?.type;
          
          if (taskId && taskTitle) {
            const noModuleId = `no-module-${projectId}`;
            let moduleData = project.modules.find(m => m.id === noModuleId);
            
            if (!moduleData) {
              moduleData = {
                id: noModuleId,
                name: 'No Module',
                projectId,
                tasks: [],
                totalDuration: 0,
                totalWorkLogs: 0,
              };
              project.modules.push(moduleData);
            }
            
            moduleData.totalDuration += workLog.durationMin;
            moduleData.totalWorkLogs += 1;
            
            let task = moduleData.tasks.find(t => t.id === taskId);
            
            if (!task) {
              task = {
                id: taskId,
                title: taskTitle,
                type: taskType,
                moduleId: noModuleId,
                workLogs: [],
                totalDuration: 0,
              };
              moduleData.tasks.push(task);
            }
            
            task.workLogs.push(workLog);
            task.totalDuration += workLog.durationMin;
          }
        }
      });
      
      return Array.from(projectsMap.values());
    }),

  create: protectedProcedure
    .input(createWotkLogSchema)
    .mutation(async ({ ctx, input }) => {
      const task = await ctx.db.task.findUnique({
        where: { id: input.taskId },
        select: {
          id: true,
          module: {
            select: {
              timeDisplayMultiplier: true,
              project: {
                select: {
                  timeDisplayMultiplier: true,
                  client: {
                    select: {
                      timeDisplayMultiplier: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!task) {
        throw new Error("Task not found.");
      }

      const overlappingWorkLog = await ctx.db.workLog.findFirst({
        where: {
          userId: ctx.session.user.id,
          AND: [
            { startTime: { lt: input.endTime } },
            { endTime: { gt: input.startTime } },
          ],
        },
        select: {
          startTime: true,
          endTime: true,
          task: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      });

      if (overlappingWorkLog) {
        const rawTitle = overlappingWorkLog.task?.title ?? "Unnamed Task";
        const shortTitle =
          rawTitle.length > 80 ? rawTitle.slice(0, 77) + "..." : rawTitle;

        throw new Error(`Overlapping work log exists in "${shortTitle}"`);
      }

      const durationMin =
        (input.endTime.getTime() - input.startTime.getTime()) / 60000;

      if (durationMin <= 0) {
        throw new Error("End time must be after start time.");
      }

      const timeDisplayMultiplier = parseFloat(
        String(
          task.module?.timeDisplayMultiplier ??
            task.module?.project?.timeDisplayMultiplier ??
            task.module?.project?.client?.timeDisplayMultiplier ??
            1,
        ),
      );

      const clientAdjustedDurationMin = durationMin * timeDisplayMultiplier;

      return ctx.db.workLog.create({
        data: {
          taskId: input.taskId,
          userId: ctx.session.user.id,
          startTime: input.startTime,
          endTime: input.endTime,
          durationMin,
          clientAdjustedDurationMin,
          note: input.note ?? null,
        },
      });
    }),

  delete: protectedProcedure
    .input(deleteWorkLogSchema)
    .mutation(async ({ ctx, input }) => {
      const { id } = input;
      const userId = ctx.session.user.id;

      const workLog = await ctx.db.workLog.findUnique({
        where: { id },
        select: { id: true, userId: true },
      });

      if (!workLog) {
        throw new Error("Work log not found");
      }

      if (workLog.userId !== userId) {
        throw new Error("You are not authorized to update this work log.");
      }
      return ctx.db.workLog.delete({
        where: { id: input.id },
      });
    }),
});
