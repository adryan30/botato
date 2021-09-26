import { addMilliseconds, format, intervalToDuration } from "date-fns";

export default function msToHMS(miliseconds: number) {
  const duration = intervalToDuration({ start: 0, end: miliseconds });
  return `${duration.minutes}:${duration.seconds}`;
}
