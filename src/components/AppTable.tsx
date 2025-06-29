"use client";

import { DataTable, type DataTableProps } from "mantine-datatable";

import classes from "./AppTable.module.css";

export default function AppTable<T>(props: DataTableProps<T>) {
  return (
    <DataTable<T>
      minHeight={455}
      withTableBorder={false}
      withRowBorders
      // withColumnBorders
      classNames={{
        root: classes.root,
        table: classes.table,
        header: classes.header,
        pagination: classes.pagination
      }}
      {...props}
    />
  );
}
