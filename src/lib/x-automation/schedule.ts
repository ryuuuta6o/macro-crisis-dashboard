import { POSTING_SLOTS } from "@/config/x-automation";
import type { PostingSlot } from "@/types/x-automation";

function jstParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

export function getSlotScheduledAt(slot: PostingSlot, now = new Date()) {
  const parts = jstParts(now);
  const config = POSTING_SLOTS[slot];
  const utc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    config.hour - 9,
    config.minute,
  );
  return new Date(utc).toISOString();
}

export function isWithinPostingWindow(
  slot: PostingSlot,
  now = new Date(),
  toleranceMinutes = 45,
) {
  const scheduled = new Date(getSlotScheduledAt(slot, now));
  return Math.abs(now.getTime() - scheduled.getTime()) <= toleranceMinutes * 60_000;
}

export function getNextPosting(now = new Date()) {
  const candidates = (Object.keys(POSTING_SLOTS) as PostingSlot[]).flatMap((slot) => {
    const today = new Date(getSlotScheduledAt(slot, now));
    const next = today > now ? today : new Date(today.getTime() + 86_400_000);
    return [{ slot, at: next.toISOString(), label: POSTING_SLOTS[slot].label }];
  });
  return candidates.sort((a, b) => a.at.localeCompare(b.at))[0];
}

