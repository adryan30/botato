import { addMilliseconds, format, intervalToDuration } from "date-fns";

export default function msToHMS(miliseconds: number) {
  const duration = intervalToDuration({ start: 0, end: miliseconds });
  return `${duration.hours ? `${duration.hours}:` : ""}${duration.minutes}:${
    duration.seconds
  }`;
}
