import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Activity, Github } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({ meta: [{ title: "Sign in | ProfilePulse" }, { name: "description", content: "Sign in to securely monitor organization member profiles." }, { property: "og:title", content: "Sign in | ProfilePulse" }, { property: "og:description", content: "Secure access to ProfilePulse profile monitoring." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [signup, setSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    const result = signup ? await supabase.auth.signUp({ email, password }) : await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (result.error) return setMessage(result.error.message);
    if (signup && !result.data.session) return setMessage("Check your email to confirm your account, then sign in.");
    await navigate({ to: "/app" });
  }
  async function google() {
    setBusy(true); const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin }); setBusy(false);
    if (result.error) setMessage(result.error.message); else if (!result.redirected) await navigate({ to: "/app" });
  }
  return <main className="auth-shell"><section className="auth-intro"><div className="brand-mark"><Activity /> ProfilePulse</div><h1>Profile activity, measured responsibly.</h1><p>Import members, monitor permitted public GitHub signals, and report what the data actually shows.</p><ul><li>Organization-level access controls</li><li>Transparent activity classification</li><li>No LinkedIn scraping or invented results</li></ul></section><section className="auth-panel"><div className="auth-card"><Github className="auth-icon"/><p className="eyebrow">Secure workspace</p><h2>{signup ? "Create your account" : "Welcome back"}</h2><p className="muted">{signup ? "Start a protected ProfilePulse workspace." : "Sign in to continue to your organizations."}</p><Button variant="outline" className="w-full mt-6" onClick={google} disabled={busy}>Continue with Google</Button><div className="divider"><span>or</span></div><form onSubmit={submit} className="space-y-4"><label>Email<Input required type="email" value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="you@organization.org"/></label><label>Password<Input required minLength={8} type="password" value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="At least 8 characters"/></label>{message && <p className="form-message">{message}</p>}<Button className="w-full" disabled={busy}>{busy ? "Please wait…" : signup ? "Create account" : "Sign in"}</Button></form><button className="text-link" onClick={()=>{setSignup(!signup);setMessage("")}}>{signup ? "Already registered? Sign in" : "Need an account? Register"}</button></div></section></main>;
}