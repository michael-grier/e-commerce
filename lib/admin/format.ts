const adminDateFormatter = new Intl.DateTimeFormat("en-CA", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

export function formatAdminDate(date: Date): string {
  return `${adminDateFormatter.format(date)} UTC`;
}
