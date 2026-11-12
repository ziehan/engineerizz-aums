import { Greeting } from "./types";

export function getGreetings(
  date: Date = new Date(),
  timeZone?: string
): Greeting {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      hourCycle: "h23", 
      timeZone,
    }).format(date)
  );

  if (hour >= 5 && hour < 11) {
    return "pagi"; 
  }

  if (hour >= 11 && hour < 15) {
    return "siang";
  }

  if (hour >= 15 && hour < 18) {
    return "sore"; 
  }

  return "malam";
}