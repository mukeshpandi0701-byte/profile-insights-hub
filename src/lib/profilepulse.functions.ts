import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { classifyActivity } from "./profilepulse";

const monitorSchema = z.object({ organizationId: z.string().uuid(), memberIds: z.array(z.string().uuid()).min(1).max(100) });

export const monitorGithub = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => monitorSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: admin } = await context.supabase.rpc("is_org_admin", { _organization_id: data.organizationId, _user_id: context.userId });
    if (!admin) throw new Error("Administrator access is required to run monitoring.");
    const { data: settings } = await context.supabase.from("organization_settings").select("activity_threshold_days").eq("organization_id", data.organizationId).single();
    const threshold = settings?.activity_threshold_days ?? 30;
    const { data: members, error } = await context.supabase.from("members").select("id, github_username, github_url").eq("organization_id", data.organizationId).in("id", data.memberIds);
    if (error) throw error;
    const targets = (members ?? []).filter((member) => member.github_username && member.github_url);
    const { data: job, error: jobError } = await context.supabase.from("monitoring_jobs").insert({ organization_id: data.organizationId, created_by: context.userId, platform: "github", status: "running", total_profiles: targets.length, member_ids: targets.map((member) => member.id), started_at: new Date().toISOString() }).select("id").single();
    if (jobError) throw new Error(jobError.code === "23505" ? "A GitHub monitoring job is already running." : jobError.message);
    let successful = 0;
    let failed = 0;
    const token = process.env["GITHUB_TOKEN"];
    for (const member of targets) {
      const now = new Date().toISOString();
      try {
        const headers: Record<string, string> = { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "ProfilePulse" };
        if (token) headers.Authorization = `Bearer ${token}`;
        const [userResponse, reposResponse, eventsResponse] = await Promise.all([
          fetch(`https://api.github.com/users/${encodeURIComponent(member.github_username ?? "")}`, { headers }),
          fetch(`https://api.github.com/users/${encodeURIComponent(member.github_username ?? "")}/repos?sort=updated&per_page=100&type=owner`, { headers }),
          fetch(`https://api.github.com/users/${encodeURIComponent(member.github_username ?? "")}/events/public?per_page=100`, { headers }),
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
        const [code, message] = (caught instanceof Error ? caught.message : "github_error|GitHub monitoring failed").split("|");
        await context.supabase.from("github_monitoring").update({ classification: "monitoring_failed", classification_reason: message ?? code, threshold_days: threshold, monitored_at: now, error_code: message ? code : "github_error", error_message: message ?? code }).eq("member_id", member.id);
        await context.supabase.from("monitoring_history").insert({ organization_id: data.organizationId, member_id: member.id, job_id: job.id, platform: "github", classification: "monitoring_failed", reason: message ?? code, threshold_days: threshold, data_source: "GitHub REST API", success: false, error_code: message ? code : "github_error", error_message: message ?? code, monitored_at: now });
      }
      await context.supabase.from("monitoring_jobs").update({ processed_profiles: successful + failed, successful_profiles: successful, failed_profiles: failed }).eq("id", job.id);
    }
    await context.supabase.from("monitoring_jobs").update({ status: failed === 0 ? "completed" : successful > 0 ? "partial" : "failed", completed_at: new Date().toISOString() }).eq("id", job.id);
    return { total: targets.length, successful, failed };
  });