import { GmailLabel } from "@/utils/gmail/label";
import type { ParsedMessage } from "@/utils/types";

export type ExpirableCategory =
  | "NOTIFICATION"
  | "NEWSLETTER"
  | "MARKETING"
  | "SOCIAL"
  | "CALENDAR"
  | null;

export const categoryDefaults: Record<
  NonNullable<ExpirableCategory>,
  number
> = {
  NOTIFICATION: 7,
  NEWSLETTER: 30,
  MARKETING: 14,
  SOCIAL: 7,
  CALENDAR: 1,
};

/**
 * Detect if an email should be analyzed for expiration.
 * Returns the category if expirable, null if not.
 *
 * @param message - The parsed email message
 * @param appliedLabels - Labels that were just applied by AI rules (solves chicken-and-egg problem)
 */
export function detectExpirableCategory(
  message: ParsedMessage,
  appliedLabels?: string[],
): ExpirableCategory {
  const gmailLabels = message.labelIds || [];

  // Combine Gmail labels with AI-applied labels (normalized to lowercase for comparison)
  const appliedLabelsLower = (appliedLabels || []).map((l) => l.toLowerCase());

  // Check Gmail categories first
  if (gmailLabels.includes(GmailLabel.SOCIAL)) return "SOCIAL";
  if (gmailLabels.includes(GmailLabel.PROMOTIONS)) return "MARKETING";
  if (gmailLabels.includes(GmailLabel.UPDATES)) return "NOTIFICATION";
  if (gmailLabels.includes(GmailLabel.FORUMS)) return "NEWSLETTER";

  // Check AI-applied labels for category keywords
  for (const label of appliedLabelsLower) {
    if (
      label.includes("social") ||
      label.includes("twitter") ||
      label.includes("facebook") ||
      label.includes("linkedin")
    )
      return "SOCIAL";
    if (
      label.includes("promo") ||
      label.includes("marketing") ||
      label.includes("sale") ||
      label.includes("offer")
    )
      return "MARKETING";
    if (
      label.includes("notification") ||
      label.includes("alert") ||
      label.includes("update") ||
      label.includes("shipping") ||
      label.includes("delivery") ||
      label.includes("tracking")
    )
      return "NOTIFICATION";
    if (
      label.includes("newsletter") ||
      label.includes("digest") ||
      label.includes("weekly") ||
      label.includes("daily")
    )
      return "NEWSLETTER";
    if (
      label.includes("calendar") ||
      label.includes("event") ||
      label.includes("meeting") ||
      label.includes("invite")
    )
      return "CALENDAR";
  }

  // Check for calendar invites (via attachments)
  const hasCalendarAttachment = message.attachments?.some(
    (att) =>
      att.mimeType?.includes("calendar") ||
      att.filename?.endsWith(".ics") ||
      att.filename?.endsWith(".ical"),
  );
  if (hasCalendarAttachment) return "CALENDAR";

  // Check for unsubscribe link (newsletter indicator)
  const listUnsubscribe = message.headers?.["list-unsubscribe"];
  if (listUnsubscribe) return "NEWSLETTER";

  return null;
}

/**
 * Get default expiration days for a category.
 */
export function getDefaultExpirationDays(
  category: ExpirableCategory,
  userSettings?: {
    notificationDays?: number;
    newsletterDays?: number;
    marketingDays?: number;
    socialDays?: number;
    calendarDays?: number;
  },
): number {
  if (!category) return 30; // Fallback default

  // Use user settings if available, otherwise category defaults
  switch (category) {
    case "NOTIFICATION":
      return userSettings?.notificationDays ?? categoryDefaults.NOTIFICATION;
    case "NEWSLETTER":
      return userSettings?.newsletterDays ?? categoryDefaults.NEWSLETTER;
    case "MARKETING":
      return userSettings?.marketingDays ?? categoryDefaults.MARKETING;
    case "SOCIAL":
      return userSettings?.socialDays ?? categoryDefaults.SOCIAL;
    case "CALENDAR":
      return userSettings?.calendarDays ?? categoryDefaults.CALENDAR;
    default:
      return 30;
  }
}
