import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { classifyActivity } from "./profilepulse";

const monitorSchema = z.object({ organizationId: z.string().uuid(), memberIds: z.array(z.string().uuid()).min(1).max(100) });
const organizationSchema = z.object({ organizationId: z.string().uuid() });
const linkedinSyncSchema = organizationSchema.extend({ memberId: z.string().uuid() });

async function requireAdministrator(context: { supabase: any; userId: string }, organizationId: string) {
  const { data: role } = await context.supabase.from("user_roles").select("role").eq("organization_id", organizationId).eq("user_id", context.userId).maybeSingle();
  if (role?.role !== "admin") throw new Error("Administrator access is required.");
}

export const getIntegrationStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => organizationSchema.parse(input))
  .handler(async ({ data, context }) => {
    await requireAdministrator(context, data.organizationId);
    return {
      github: Boolean(process.env["GITHUB_API_KEY"] && process.env["LOVABLE_API_KEY"]),
      linkedin: Boolean(process.env["LINKEDIN_API_KEY"] && process.env["LOVABLE_API_KEY"]),
    };
  });

export const syncLinkedinProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => linkedinSyncSchema.parse(input))
  .handler(async ({ data, context }) => {
    await requireAdministrator(context, data.organizationId);
    const lovableKey = process.env["LOVABLE_API_KEY"];
    const linkedinKey = process.env["LINKEDIN_API_KEY"];
    if (!lovableKey || !linkedinKey) throw new Error("Connect LinkedIn before syncing a profile.");
    const { data: member } = await context.supabase.from("members").select("id, linkedin_url").eq("id", data.memberId).eq("organization_id", data.organizationId).maybeSingle();
    if (!member?.linkedin_url) throw new Error("Choose a member with a LinkedIn profile URL.");
    const response = await fetch("https://connector-gateway.lovable.dev/linkedin/v2/userinfo", {
      headers: { Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": linkedinKey },
    });
    if (!response.ok) {
      const detail = await response.text();
      console.error(`LinkedIn profile sync failed [${response.status}]: ${detail}`);
      throw new Error(`LinkedIn authorization failed (${response.status}). Reconnect LinkedIn and try again.`);
    }
    const profile = await response.json() as Record<string, unknown>;
    const now = new Date().toISOString();
    const { error } = await context.supabase.from("linkedin_integrations").upsert({
      member_id: member.id,
      organization_id: data.organizationId,
      profile_url: member.linkedin_url,
      integration_status: "connected",
      authorization_status: "authorized",
      data_availability: "profile_only",
      authorized_profile: profile,
      authorized_activity: [],
      last_successful_sync_at: now,
      error_message: null,
    });
    if (error) throw error;
    await context.supabase.from("organization_settings").update({ linkedin_configured: true }).eq("organization_id", data.organizationId);
    return { name: typeof profile["name"] === "string" ? profile["name"] : "LinkedIn member", syncedAt: now };
  });

export const monitorGithub = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => monitorSchema.parse(input))
  .handler(async ({ data, context }) => {
    await requireAdministrator(context, data.organizationId);
    const { data: settings } = await context.supabase.from("organization_settings").select("activity_threshold_days").eq("organization_id", data.organizationId).single();
    const threshold = settings?.activity_threshold_days ?? 30;
    const { data: members, error } = await context.supabase.from("members").select("id, github_username, github_url").eq("organization_id", data.organizationId).in("id", data.memberIds);
    if (error) throw error;
    const targets = (members ?? []).filter((member) => member.github_username && member.github_url);
    const { data: job, error: jobError } = await context.supabase.from("monitoring_jobs").insert({ organization_id: data.organizationId, created_by: context.userId, platform: "github", status: "running", total_profiles: targets.length, member_ids: targets.map((member) => member.id), started_at: new Date().toISOString() }).select("id").single();
    if (jobError) throw new Error(jobError.code === "23505" ? "A GitHub monitoring job is already running." : jobError.message);
    let successful = 0;
    let failed = 0;
    const lovableKey = process.env["LOVABLE_API_KEY"];
    const githubKey = process.env["GITHUB_API_KEY"];
    const token = process.env["GITHUB_TOKEN"];
    for (const member of targets) {
      const now = new Date().toISOString();
      try {
        const usingConnector = Boolean(lovableKey && githubKey);
        const baseUrl = usingConnector ? "https://connector-gateway.lovable.dev/github" : "https://api.github.com";
        const headers: Record<string, string> = { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "ProfilePulse" };
        if (usingConnector) { headers["Authorization"] = `Bearer ${lovableKey}`; headers["X-Connection-Api-Key"] = githubKey ?? ""; }
        else if (token) headers["Authorization"] = `Bearer ${token}`;
        const [userResponse, reposResponse, eventsResponse] = await Promise.all([
          fetch(`${baseUrl}/users/${encodeURIComponent(member.github_username ?? "")}`, { headers }),
          fetch(`${baseUrl}/users/${encodeURIComponent(member.github_username ?? "")}/repos?sort=updated&per_page=100&type=owner`, { headers }),
          fetch(`${baseUrl}/users/${encodeURIComponent(member.github_username ?? "")}/events/public?per_page=100`, { headers }),
        ]);
        if (!userResponse.ok) {
          const code = userResponse.status === 403 || userResponse.status === 429 ? "rate_limited" : userResponse.status === 404 ? "profile_not_found" : "github_error";
          throw new Error(`${code}|GitHub returned ${userResponse.status}. ${userResponse.status === 403 ? "The API rate limit may have been reached; retry after it resets." : "The profile may be unavailable."}`);
        }
        const profile = await userResponse.json() as { login: string; html_url: string; created_at: string; public_repos: number; followers: number; following: number };
        const repos = reposResponse.ok ? await reposResponse.json() as Array<{ name: string; html_url: string; created_at: string; updated_at: string; pushed_at: string | null; open_issues_count: number }> : [];
        const events = eventsResponse.ok ? await eventsResponse.json() as Array<{ type: string; created_at: string; repo: { name: string } }> : [];
        const dates = [...repos.map((repo) => repo.pushed_at ?? repo.updated_at), ...events.map((event) => event.created_at)].filter(Boolean).sort();
        const lastActivity = dates.at(-1) ?? null;
        const result = classifyActivity(lastActivity, threshold, reposResponse.ok || eventsResponse.ok);
        const rateRemaining = Number(userResponse.headers.get("x-ratelimit-remaining") ?? "0");
        await context.supabase.from("github_monitoring").upsert({ member_id: member.id, organization_id: data.organizationId, username: profile.login, profile_url: profile.html_url, account_created_at: profile.created_at, public_repos_count: profile.public_repos, followers_count: profile.followers, following_count: profile.following, repositories: repos.slice(0, 100), public_events: events.slice(0, 100), last_observable_activity_at: lastActivity, classification: result.classification, classification_reason: result.reason, threshold_days: threshold, monitored_at: now, last_successful_at: now, error_code: null, error_message: null, rate_limit_remaining: rateRemaining, raw_summary: { repositoryRequestAvailable: reposResponse.ok, eventsRequestAvailable: eventsResponse.ok } });
        await context.supabase.from("monitoring_history").insert({ organization_id: data.organizationId, member_id: member.id, job_id: job.id, platform: "github", classification: result.classification, reason: result.reason, last_observable_activity_at: lastActivity, threshold_days: threshold, data_source: "GitHub REST API", success: true, monitored_at: now });
        successful++;
      } catch (caught) {
        failed++;
        const [rawCode, rawMessage] = (caught instanceof Error ? caught.message : "github_error|GitHub monitoring failed").split("|");
        const code = rawMessage ? rawCode ?? "github_error" : "github_error";
        const message = rawMessage ?? rawCode ?? "GitHub monitoring failed";
        await context.supabase.from("github_monitoring").update({ classification: "monitoring_failed", classification_reason: message, threshold_days: threshold, monitored_at: now, error_code: code, error_message: message }).eq("member_id", member.id);
        await context.supabase.from("monitoring_history").insert({ organization_id: data.organizationId, member_id: member.id, job_id: job.id, platform: "github", classification: "monitoring_failed", reason: message, threshold_days: threshold, data_source: "GitHub REST API", success: false, error_code: code, error_message: message, monitored_at: now });
      }
      await context.supabase.from("monitoring_jobs").update({ processed_profiles: successful + failed, successful_profiles: successful, failed_profiles: failed }).eq("id", job.id);
    }
    await context.supabase.from("monitoring_jobs").update({ status: failed === 0 ? "completed" : successful > 0 ? "partial" : "failed", completed_at: new Date().toISOString() }).eq("id", job.id);
    return { total: targets.length, successful, failed };
  });