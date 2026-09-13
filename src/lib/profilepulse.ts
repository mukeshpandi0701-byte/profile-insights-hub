export const REQUIRED_COLUMNS = ["S.No", "Name", "Department", "LinkedIn Link", "GitHub Link"] as const;

export type ImportRow = {
  rowNumber: number;
  serialNumber: number | null;
  name: string;
  department: string;
  linkedinUrl: string;
  githubUrl: string;
  githubUsername: string;
  errors: string[];
};

export function normalizeGithubUrl(value: string) {
  const raw = value.trim();
  if (!raw) return { url: "", username: "" };
  try {
    const candidate = raw.startsWith("http") ? raw : `https://${raw}`;
    const url = new URL(candidate);
    if (!["github.com", "www.github.com"].includes(url.hostname.toLowerCase())) return null;
    const username = url.pathname.split("/").filter(Boolean)[0] ?? "";
    if (!/^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i.test(username)) return null;
    return { url: `https://github.com/${username}`, username };
  } catch {
    return null;
  }
}

export function normalizeLinkedinUrl(value: string) {
  const raw = value.trim();
  if (!raw) return "";
  try {
    const candidate = raw.startsWith("http") ? raw : `https://${raw}`;
    const url = new URL(candidate);
    if (!["linkedin.com", "www.linkedin.com"].includes(url.hostname.toLowerCase())) return null;
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts[0] !== "in" || !parts[1]) return null;
    return `https://www.linkedin.com/in/${parts[1]}`;
  } catch {
    return null;
  }
}

export function validateImportRow(raw: Record<string, unknown>, rowNumber: number): ImportRow {
  const errors: string[] = [];
  const serialRaw = String(raw["S.No"] ?? "").trim();
  const serialNumber = /^\d+$/.test(serialRaw) && Number(serialRaw) > 0 ? Number(serialRaw) : null;
  const name = String(raw["Name"] ?? "").trim();
  const department = String(raw["Department"] ?? "").trim();
  const github = normalizeGithubUrl(String(raw["GitHub Link"] ?? ""));
  const linkedin = normalizeLinkedinUrl(String(raw["LinkedIn Link"] ?? ""));
  if (serialNumber === null) errors.push("S.No must be a positive whole number");
  if (name.length < 2 || name.length > 160) errors.push("Name must contain 2–160 characters");
  if (department.length < 1 || department.length > 100) errors.push("Department is required (maximum 100 characters)");
  if (github === null) errors.push("GitHub Link must be a valid github.com profile URL");
  if (linkedin === null) errors.push("LinkedIn Link must be a valid linkedin.com/in profile URL");
  return { rowNumber, serialNumber, name, department, linkedinUrl: linkedin ?? "", githubUrl: github?.url ?? "", githubUsername: github?.username ?? "", errors };
}

export function classifyActivity(lastActivity: string | null, thresholdDays: number, hasReliableData: boolean) {
  if (!hasReliableData) return { classification: "no_observable_activity" as const, reason: "GitHub returned no qualifying public events or repository updates." };
  if (!lastActivity) return { classification: "no_observable_activity" as const, reason: "No observable public activity date was available." };
  const cutoff = Date.now() - thresholdDays * 86_400_000;
  if (new Date(lastActivity).getTime() >= cutoff) return { classification: "active" as const, reason: `Observable public GitHub activity occurred within the last ${thresholdDays} days.` };
  return { classification: "inactive" as const, reason: `Reliable public data was available, but no qualifying activity was observed within the last ${thresholdDays} days.` };
}

export const STATUS_LABELS: Record<string, string> = {
  active: "Active", inactive: "Inactive", no_observable_activity: "No observable activity",
  data_unavailable: "Data unavailable", monitoring_failed: "Monitoring failed", not_monitored: "Not monitored",
};