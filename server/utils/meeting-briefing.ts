/**
 * Company and business context for the meeting voice agent, read from the same
 * markdown files the agent uses. PERSONAL.md is never included in a meeting.
 */
export async function loadMeetingBriefing(): Promise<string> {
  const storage = useStorage("assets:identity");
  const [company, business] = await Promise.all([
    storage.getItem<string>("COMPANY.md"),
    storage.getItem<string>("BUSINESS.md"),
  ]);
  return [company, business].map((part) => (part ?? "").trim()).filter(Boolean).join("\n\n");
}
