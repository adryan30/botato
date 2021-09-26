import { intervalToDuration } from "date-fns";

export function msToHMS(miliseconds: number) {
  if (miliseconds > 10800000) {
    return "Livestream";
  }
  const { hours, minutes, seconds } = intervalToDuration({
    start: 0,
    end: miliseconds,
  });
  const hoursFmt = hours < 10 ? `0${hours}` : hours;
  const minutesFmt = minutes < 10 ? `0${minutes}` : minutes;
  const secondsFmt = seconds < 10 ? `0${seconds}` : seconds;
  return `${hours ? `${hoursFmt}:` : ""}${minutesFmt}:${secondsFmt}`;
}
