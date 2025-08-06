import { utils, writeFileXLSX } from "xlsx";
import dayjs from "dayjs";
import { formatDurationFromMinutes } from "./format-duration-from-minutes";

// Types for the hierarchical data structure
type WorkLogExportData = {
  projectName: string;
  moduleName: string;
  taskTitle: string;
  taskType: string;
  totalDuration: number;
  totalWorkLogs: number;
  firstWorkLogDate: Date | null;
  lastWorkLogDate: Date | null;
  level: 'project' | 'module' | 'task';
  projectId: string;
  moduleId?: string;
};

type ProjectData = {
  id: string;
  name: string;
  totalDuration: number;
  totalWorkLogs: number;
  firstWorkLogDate: Date | null;
  lastWorkLogDate: Date | null;
};

type ModuleData = {
  id: string;
  name: string;
  projectId: string;
  totalDuration: number;
  totalWorkLogs: number;
  firstWorkLogDate: Date | null;
  lastWorkLogDate: Date | null;
};

type TaskData = {
  id: string;
  title: string;
  type: string;
  moduleId: string;
  totalDuration: number;
  totalWorkLogs: number;
  firstWorkLogDate: Date | null;
  lastWorkLogDate: Date | null;
};

// Convert hierarchical data to nested structure for Excel
function createNestedExportData(
  projects: ProjectData[],
  modulesMap: Map<string, ModuleData[]>,
  tasksMap: Map<string, TaskData[]>,
): WorkLogExportData[] {
  const exportData: WorkLogExportData[] = [];

  for (const project of projects) {
    // Add project row
    exportData.push({
      projectName: project.name,
      moduleName: "",
      taskTitle: "",
      taskType: "",
      totalDuration: project.totalDuration,
      totalWorkLogs: project.totalWorkLogs,
      firstWorkLogDate: project.firstWorkLogDate,
      lastWorkLogDate: project.lastWorkLogDate,
      level: 'project',
      projectId: project.id,
    });

    const modules = modulesMap.get(project.id) ?? [];
    
    if (modules.length === 0) {
      // Project with no modules - add a placeholder
      exportData.push({
        projectName: "",
        moduleName: "No Module",
        taskTitle: "",
        taskType: "",
        totalDuration: 0,
        totalWorkLogs: 0,
        firstWorkLogDate: null,
        lastWorkLogDate: null,
        level: 'module',
        projectId: project.id,
        moduleId: `no-module-${project.id}`,
      });
    } else {
      for (const moduleData of modules) {
        // Add module row
        exportData.push({
          projectName: "",
          moduleName: moduleData.name,
          taskTitle: "",
          taskType: "",
          totalDuration: moduleData.totalDuration,
          totalWorkLogs: moduleData.totalWorkLogs,
          firstWorkLogDate: moduleData.firstWorkLogDate,
          lastWorkLogDate: moduleData.lastWorkLogDate,
          level: 'module',
          projectId: project.id,
          moduleId: moduleData.id,
        });

        const tasks = tasksMap.get(moduleData.id) ?? [];
        
        if (tasks.length === 0) {
          // Module with no tasks - add a placeholder
          exportData.push({
            projectName: "",
            moduleName: "",
            taskTitle: "No Tasks",
            taskType: "",
            totalDuration: 0,
            totalWorkLogs: 0,
            firstWorkLogDate: null,
            lastWorkLogDate: null,
            level: 'task',
            projectId: project.id,
            moduleId: moduleData.id,
          });
        } else {
          for (const task of tasks) {
            // Add task row
            exportData.push({
              projectName: "",
              moduleName: "",
              taskTitle: task.title,
              taskType: task.type,
              totalDuration: task.totalDuration,
              totalWorkLogs: task.totalWorkLogs,
              firstWorkLogDate: task.firstWorkLogDate,
              lastWorkLogDate: task.lastWorkLogDate,
              level: 'task',
              projectId: project.id,
              moduleId: moduleData.id,
            });
          }
        }
      }
    }
  }

  return exportData;
}

// Convert export data to Excel rows with styling
function convertToExcelRowsWithStyling(data: WorkLogExportData[]): {
  rows: (string | number | null)[][];
  styles: Array<{ row: number; style: { fill?: { fgColor: { rgb: string } }; font?: { bold?: boolean } } }>;
} {
  const headers = [
    "Project",
    "Module", 
    "Task",
    "Task Type",
    "Total Duration (Hours)",
    "Total Duration (Formatted)",
    "Work Logs Count",
    "First Entry",
    "Last Entry",
  ];

  const rows: (string | number | null)[][] = [];
  const styles: Array<{ row: number; style: { fill?: { fgColor: { rgb: string } }; font?: { bold?: boolean } } }> = [];

  // Add headers
  rows.push(headers);

  // Add data rows with styling
  data.forEach((item, index) => {
    const rowIndex = index + 1; // +1 because headers are at row 0
    
    const row = [
      item.projectName,
      item.moduleName,
      item.taskTitle,
      item.taskType,
      item.totalDuration / 60, // Convert minutes to hours
      formatDurationFromMinutes(item.totalDuration),
      item.totalWorkLogs,
      item.firstWorkLogDate ? dayjs(item.firstWorkLogDate).format("MMM D, YYYY") : "",
      item.lastWorkLogDate ? dayjs(item.lastWorkLogDate).format("MMM D, YYYY") : "",
    ];

    rows.push(row);

    // Add styling based on level
    if (item.level === 'project') {
      styles.push({
        row: rowIndex,
        style: {
          fill: { fgColor: { rgb: "E3F2FD" } }, // Light blue background
          font: { bold: true },
        }
      });
    } else if (item.level === 'module') {
      styles.push({
        row: rowIndex,
        style: {
          fill: { fgColor: { rgb: "F3E5F5" } }, // Light purple background
          font: { bold: true },
        }
      });
    } else if (item.level === 'task') {
      styles.push({
        row: rowIndex,
        style: {
          fill: { fgColor: { rgb: "FFFFFF" } }, // White background
        }
      });
    }
  });

  return { rows, styles };
}

// Main export function for nested structure
export async function exportWorkLogsToExcel(
  projects: ProjectData[],
  modulesMap: Map<string, ModuleData[]>,
  tasksMap: Map<string, TaskData[]>,
  dateRange: [Date | null, Date | null] | null,
): Promise<void> {
  try {
    // Create nested export data
    const exportData = createNestedExportData(projects, modulesMap, tasksMap);
    
    // Convert to Excel format with styling
    const { rows, styles } = convertToExcelRowsWithStyling(exportData);
    
    // Create workbook and worksheet
    const workbook = utils.book_new();
    const worksheet = utils.aoa_to_sheet(rows);
    
    // Set column widths
    const columnWidths = [
      { wch: 25 }, // Project
      { wch: 20 }, // Module
      { wch: 30 }, // Task
      { wch: 15 }, // Task Type
      { wch: 15 }, // Total Duration (Hours)
      { wch: 15 }, // Total Duration (Formatted)
      { wch: 12 }, // Work Logs Count
      { wch: 12 }, // First Entry
      { wch: 12 }, // Last Entry
    ];
    worksheet["!cols"] = columnWidths;
    
    // Apply styles
    styles.forEach(({ row, style }) => {
      const range = utils.decode_range(worksheet["!ref"] ?? "A1");
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = utils.encode_cell({ r: row, c: col });
        worksheet[cellAddress] ??= { v: "" };
        worksheet[cellAddress].s ??= style;
      }
    });
    
    // Add worksheet to workbook
    utils.book_append_sheet(workbook, worksheet, "Work Logs Report");
    
    // Generate filename with date range
    const now = dayjs().format("YYYY-MM-DD_HH-mm");
    let filename = `work_logs_report_${now}.xlsx`;
    
    if (dateRange?.[0] && dateRange?.[1]) {
      const startDate = dayjs(dateRange[0]).format("YYYY-MM-DD");
      const endDate = dayjs(dateRange[1]).format("YYYY-MM-DD");
      filename = `work_logs_report_${startDate}_to_${endDate}_${now}.xlsx`;
    }
    
    // Write file
    writeFileXLSX(workbook, filename);
    
  } catch (error) {
    console.error("Error exporting to Excel:", error);
    throw new Error("Failed to export work logs to Excel");
  }
}

// Alternative function for exporting only visible data (more memory efficient)
export async function exportVisibleWorkLogsToExcel(
  visibleData: WorkLogExportData[],
  dateRange: [Date | null, Date | null] | null,
): Promise<void> {
  try {
    // Convert to Excel format with styling
    const { rows, styles } = convertToExcelRowsWithStyling(visibleData);
    
    // Create workbook and worksheet
    const workbook = utils.book_new();
    const worksheet = utils.aoa_to_sheet(rows);
    
    // Set column widths
    const columnWidths = [
      { wch: 25 }, // Project
      { wch: 20 }, // Module
      { wch: 30 }, // Task
      { wch: 15 }, // Task Type
      { wch: 15 }, // Total Duration (Hours)
      { wch: 15 }, // Total Duration (Formatted)
      { wch: 12 }, // Work Logs Count
      { wch: 12 }, // First Entry
      { wch: 12 }, // Last Entry
    ];
    worksheet["!cols"] = columnWidths;
    
    // Apply styles
    styles.forEach(({ row, style }) => {
      const range = utils.decode_range(worksheet["!ref"] ?? "A1");
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = utils.encode_cell({ r: row, c: col });
        worksheet[cellAddress] ??= { v: "" };
        worksheet[cellAddress].s ??= style;
      }
    });
    
    // Add worksheet to workbook
    utils.book_append_sheet(workbook, worksheet, "Work Logs Report");
    
    // Generate filename with date range
    const now = dayjs().format("YYYY-MM-DD_HH-mm");
    let filename = `work_logs_report_${now}.xlsx`;
    
    if (dateRange?.[0] && dateRange?.[1]) {
      const startDate = dayjs(dateRange[0]).format("YYYY-MM-DD");
      const endDate = dayjs(dateRange[1]).format("YYYY-MM-DD");
      filename = `work_logs_report_${startDate}_to_${endDate}_${now}.xlsx`;
    }
    
    // Write file
    writeFileXLSX(workbook, filename);
    
  } catch (error) {
    console.error("Error exporting to Excel:", error);
    throw new Error("Failed to export work logs to Excel");
  }
} 

// Function to handle server-side data format (without level and projectId)
export async function exportServerDataToExcel(
  serverData: Array<{
    projectName: string;
    moduleName: string;
    taskTitle: string;
    taskType: string;
    totalDuration: number;
    totalWorkLogs: number;
    firstWorkLogDate: Date | null;
    lastWorkLogDate: Date | null;
  }>,
  dateRange: [Date | null, Date | null] | null,
): Promise<void> {
  try {
    // Convert server data to our format with level detection
    const exportData: WorkLogExportData[] = serverData.map(item => {
      let level: 'project' | 'module' | 'task' = 'task';
      let projectId = '';
      let moduleId: string | undefined;

      // Determine level based on which fields are populated
      if (item.projectName && !item.moduleName && !item.taskTitle) {
        level = 'project';
        projectId = item.projectName; // Use name as ID for now
      } else if (item.moduleName && !item.taskTitle) {
        level = 'module';
        projectId = item.projectName || '';
        moduleId = item.moduleName; // Use name as ID for now
      } else {
        level = 'task';
        projectId = item.projectName || '';
        moduleId = item.moduleName || undefined;
      }

      return {
        ...item,
        level,
        projectId,
        moduleId,
      };
    });

    // Convert to Excel format with styling
    const { rows, styles } = convertToExcelRowsWithStyling(exportData);
    
    // Create workbook and worksheet
    const workbook = utils.book_new();
    const worksheet = utils.aoa_to_sheet(rows);
    
    // Set column widths
    const columnWidths = [
      { wch: 25 }, // Project
      { wch: 20 }, // Module
      { wch: 30 }, // Task
      { wch: 15 }, // Task Type
      { wch: 15 }, // Total Duration (Hours)
      { wch: 15 }, // Total Duration (Formatted)
      { wch: 12 }, // Work Logs Count
      { wch: 12 }, // First Entry
      { wch: 12 }, // Last Entry
    ];
    worksheet["!cols"] = columnWidths;
    
    // Apply styles
    styles.forEach(({ row, style }) => {
      const range = utils.decode_range(worksheet["!ref"] ?? "A1");
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = utils.encode_cell({ r: row, c: col });
        worksheet[cellAddress] ??= { v: "" };
        worksheet[cellAddress].s ??= style;
      }
    });
    
    // Add worksheet to workbook
    utils.book_append_sheet(workbook, worksheet, "Work Logs Report");
    
    // Generate filename with date range
    const now = dayjs().format("YYYY-MM-DD_HH-mm");
    let filename = `work_logs_report_${now}.xlsx`;
    
    if (dateRange?.[0] && dateRange?.[1]) {
      const startDate = dayjs(dateRange[0]).format("YYYY-MM-DD");
      const endDate = dayjs(dateRange[1]).format("YYYY-MM-DD");
      filename = `work_logs_report_${startDate}_to_${endDate}_${now}.xlsx`;
    }
    
    // Write file
    writeFileXLSX(workbook, filename);
    
  } catch (error) {
    console.error("Error exporting to Excel:", error);
    throw new Error("Failed to export work logs to Excel");
  }
} 