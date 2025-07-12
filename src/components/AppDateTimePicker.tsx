import { Group } from "@mantine/core";
import {
  DatePickerInput,
  type DatePickerInputProps,
  TimePicker,
  type TimePickerProps,
} from "@mantine/dates";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { useEffect, useState } from "react";

dayjs.extend(customParseFormat);

type AppDateTimePickerProps = {
  value: Date | null;
  onChange: (value: Date | null) => void;
  datePickerProps?: Omit<DatePickerInputProps, "value" | "onChange">;
  timePickerProps?: Omit<TimePickerProps, "value" | "onChange">;
};

export function AppDateTimePicker({
  value,
  onChange,
  datePickerProps,
  timePickerProps,
}: AppDateTimePickerProps) {
  const [date, setDate] = useState<Date | null>(value);
  const [timeStr, setTimeStr] = useState<string>("");

  useEffect(() => {
    if (value) {
      setDate(value);
      setTimeStr(dayjs(value).format("hh:mm A"));
    } else {
      setDate(null);
      setTimeStr("");
    }
  }, [value]);

  const handleChange = (d: Date | null, tStr: string) => {
    if (!d || !tStr) return onChange(null);

    const timeParsed = dayjs(tStr, "hh:mm A");
    if (!timeParsed.isValid()) return onChange(null);

    const merged = dayjs(d)
      .hour(timeParsed.hour())
      .minute(timeParsed.minute())
      .second(0)
      .millisecond(0)
      .toDate();

    onChange(merged);
  };

  return (
    <Group grow align="flex-end" gap="sm" wrap="nowrap">
      <DatePickerInput
        value={date}
        onChange={(d) => {
          const parsedDate =
            typeof d === "string" ? dayjs(d, "DD/MM/YYYY").toDate() : d;
          setDate(parsedDate);
          handleChange(parsedDate, timeStr);
        }}
        {...datePickerProps}
      />
      <TimePicker
        format="12h"
        value={timeStr}
        onChange={(val) => {
          setTimeStr(val);
          handleChange(date, val);
        }}
        {...timePickerProps}
      />
    </Group>
  );
}
