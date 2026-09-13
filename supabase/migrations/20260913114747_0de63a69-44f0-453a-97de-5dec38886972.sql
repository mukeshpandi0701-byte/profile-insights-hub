CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TYPE public.activity_status AS ENUM ('active', 'inactive', 'no_observable_activity', 'data_unavailable', 'monitoring_failed', 'not_monitored');
CREATE TYPE public.job_status AS ENUM ('queued', 'running', 'completed', 'partial', 'failed', 'cancelled');

CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(trim(name)) BETWEEN 2 AND 120),
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizations TO authenticated;
GRANT ALL ON public.organizations TO service_role;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'user',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, organization_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_org_member(_organization_id uuid, _user_id uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE organization_id = _organization_id AND user_id = _user_id)
$$;
CREATE OR REPLACE FUNCTION public.is_org_admin(_organization_id uuid, _user_id uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE organization_id = _organization_id AND user_id = _user_id AND role = 'admin')
$$;
GRANT EXECUTE ON FUNCTION public.is_org_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_org_admin(uuid, uuid) TO authenticated;

CREATE POLICY organizations_read ON public.organizations FOR SELECT TO authenticated USING (public.is_org_member(id) OR created_by = auth.uid());
CREATE POLICY organizations_create ON public.organizations FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY organizations_update ON public.organizations FOR UPDATE TO authenticated USING (public.is_org_admin(id)) WITH CHECK (public.is_org_admin(id));
CREATE POLICY organizations_delete ON public.organizations FOR DELETE TO authenticated USING (public.is_org_admin(id));
CREATE POLICY roles_read ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_org_admin(organization_id));
CREATE POLICY roles_create ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.is_org_admin(organization_id));
CREATE POLICY roles_update ON public.user_roles FOR UPDATE TO authenticated USING (public.is_org_admin(organization_id)) WITH CHECK (public.is_org_admin(organization_id));
CREATE POLICY roles_delete ON public.user_roles FOR DELETE TO authenticated USING (public.is_org_admin(organization_id));

CREATE TABLE public.departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 100),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.departments TO authenticated;
GRANT ALL ON public.departments TO service_role;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
CREATE POLICY departments_read ON public.departments FOR SELECT TO authenticated USING (public.is_org_member(organization_id));
CREATE POLICY departments_write ON public.departments FOR ALL TO authenticated USING (public.is_org_admin(organization_id)) WITH CHECK (public.is_org_admin(organization_id));

CREATE TABLE public.organization_settings (
  organization_id uuid PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  activity_threshold_days integer NOT NULL DEFAULT 30 CHECK (activity_threshold_days BETWEEN 1 AND 365),
  monitoring_frequency text NOT NULL DEFAULT 'manual' CHECK (monitoring_frequency IN ('manual','daily','weekly','monthly')),
  timezone text NOT NULL DEFAULT 'UTC',
  data_retention_days integer NOT NULL DEFAULT 730 CHECK (data_retention_days BETWEEN 30 AND 3650),
  default_report_title text NOT NULL DEFAULT 'Profile Activity Report',
  github_configured boolean NOT NULL DEFAULT false,
  linkedin_configured boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_settings TO authenticated;
GRANT ALL ON public.organization_settings TO service_role;
ALTER TABLE public.organization_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY settings_read ON public.organization_settings FOR SELECT TO authenticated USING (public.is_org_member(organization_id));
CREATE POLICY settings_write ON public.organization_settings FOR ALL TO authenticated USING (public.is_org_admin(organization_id)) WITH CHECK (public.is_org_admin(organization_id));

CREATE TABLE public.import_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  filename text NOT NULL,
  total_rows integer NOT NULL DEFAULT 0,
  imported_rows integer NOT NULL DEFAULT 0,
  skipped_rows integer NOT NULL DEFAULT 0,
  failed_rows integer NOT NULL DEFAULT 0,
  errors jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.import_batches TO authenticated;
GRANT ALL ON public.import_batches TO service_role;
ALTER TABLE public.import_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY imports_read ON public.import_batches FOR SELECT TO authenticated USING (public.is_org_member(organization_id));
CREATE POLICY imports_write ON public.import_batches FOR ALL TO authenticated USING (public.is_org_admin(organization_id)) WITH CHECK (public.is_org_admin(organization_id));

CREATE TABLE public.members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  serial_number integer NOT NULL CHECK (serial_number > 0),
  name text NOT NULL CHECK (length(trim(name)) BETWEEN 2 AND 160),
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  department_name text NOT NULL CHECK (length(trim(department_name)) BETWEEN 1 AND 100),
  linkedin_url text,
  github_url text,
  github_username text,
  source_import_batch_id uuid REFERENCES public.import_batches(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, serial_number)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.members TO authenticated;
GRANT ALL ON public.members TO service_role;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
CREATE POLICY members_read ON public.members FOR SELECT TO authenticated USING (public.is_org_member(organization_id));
CREATE POLICY members_write ON public.members FOR ALL TO authenticated USING (public.is_org_admin(organization_id)) WITH CHECK (public.is_org_admin(organization_id));
CREATE UNIQUE INDEX members_org_github_unique ON public.members (organization_id, lower(github_username)) WHERE github_username IS NOT NULL;
CREATE UNIQUE INDEX members_org_linkedin_unique ON public.members (organization_id, lower(linkedin_url)) WHERE linkedin_url IS NOT NULL;
CREATE INDEX members_org_name_idx ON public.members (organization_id, lower(name));
CREATE INDEX members_org_department_idx ON public.members (organization_id, department_name);

CREATE TABLE public.github_monitoring (
  member_id uuid PRIMARY KEY REFERENCES public.members(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  username text NOT NULL,
  profile_url text NOT NULL,
  account_created_at timestamptz,
  public_repos_count integer,
  followers_count integer,
  following_count integer,
  repositories jsonb NOT NULL DEFAULT '[]'::jsonb,
  public_events jsonb NOT NULL DEFAULT '[]'::jsonb,
  last_observable_activity_at timestamptz,
  classification public.activity_status NOT NULL DEFAULT 'not_monitored',
  classification_reason text NOT NULL DEFAULT 'This profile has not been monitored yet.',
  threshold_days integer,
  data_source text NOT NULL DEFAULT 'GitHub REST API',
  monitored_at timestamptz,
  last_successful_at timestamptz,
  error_code text,
  error_message text,
  rate_limit_remaining integer,
  raw_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.github_monitoring TO authenticated;
GRANT ALL ON public.github_monitoring TO service_role;
ALTER TABLE public.github_monitoring ENABLE ROW LEVEL SECURITY;
CREATE POLICY github_read ON public.github_monitoring FOR SELECT TO authenticated USING (public.is_org_member(organization_id));
CREATE POLICY github_write ON public.github_monitoring FOR ALL TO authenticated USING (public.is_org_admin(organization_id)) WITH CHECK (public.is_org_admin(organization_id));
CREATE INDEX github_org_class_idx ON public.github_monitoring (organization_id, classification);

CREATE TABLE public.linkedin_integrations (
  member_id uuid PRIMARY KEY REFERENCES public.members(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  profile_url text NOT NULL,
  integration_status text NOT NULL DEFAULT 'not_configured',
  authorization_status text NOT NULL DEFAULT 'not_authorized',
  data_availability text NOT NULL DEFAULT 'data_unavailable',
  authorized_profile jsonb NOT NULL DEFAULT '{}'::jsonb,
  authorized_activity jsonb NOT NULL DEFAULT '[]'::jsonb,
  last_successful_sync_at timestamptz,
  error_message text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.linkedin_integrations TO authenticated;
GRANT ALL ON public.linkedin_integrations TO service_role;
ALTER TABLE public.linkedin_integrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY linkedin_read ON public.linkedin_integrations FOR SELECT TO authenticated USING (public.is_org_member(organization_id));
CREATE POLICY linkedin_write ON public.linkedin_integrations FOR ALL TO authenticated USING (public.is_org_admin(organization_id)) WITH CHECK (public.is_org_admin(organization_id));

CREATE TABLE public.monitoring_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  platform text NOT NULL CHECK (platform IN ('github','linkedin')),
  status public.job_status NOT NULL DEFAULT 'queued',
  total_profiles integer NOT NULL DEFAULT 0,
  processed_profiles integer NOT NULL DEFAULT 0,
  successful_profiles integer NOT NULL DEFAULT 0,
  failed_profiles integer NOT NULL DEFAULT 0,
  member_ids uuid[] NOT NULL DEFAULT '{}',
  retry_of uuid REFERENCES public.monitoring_jobs(id) ON DELETE SET NULL,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.monitoring_jobs TO authenticated;
GRANT ALL ON public.monitoring_jobs TO service_role;
ALTER TABLE public.monitoring_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY jobs_read ON public.monitoring_jobs FOR SELECT TO authenticated USING (public.is_org_member(organization_id));
CREATE POLICY jobs_write ON public.monitoring_jobs FOR ALL TO authenticated USING (public.is_org_admin(organization_id)) WITH CHECK (public.is_org_admin(organization_id));
CREATE UNIQUE INDEX one_active_job_per_org_platform ON public.monitoring_jobs (organization_id, platform) WHERE status IN ('queued','running');

CREATE TABLE public.monitoring_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  job_id uuid REFERENCES public.monitoring_jobs(id) ON DELETE SET NULL,
  platform text NOT NULL CHECK (platform IN ('github','linkedin')),
  classification public.activity_status NOT NULL,
  reason text NOT NULL,
  last_observable_activity_at timestamptz,
  threshold_days integer,
  data_source text NOT NULL,
  success boolean NOT NULL DEFAULT false,
  error_code text,
  error_message text,
  monitored_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.monitoring_history TO authenticated;
GRANT ALL ON public.monitoring_history TO service_role;
ALTER TABLE public.monitoring_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY history_read ON public.monitoring_history FOR SELECT TO authenticated USING (public.is_org_member(organization_id));
CREATE POLICY history_write ON public.monitoring_history FOR ALL TO authenticated USING (public.is_org_admin(organization_id)) WITH CHECK (public.is_org_admin(organization_id));
CREATE INDEX history_org_time_idx ON public.monitoring_history (organization_id, monitored_at DESC);

CREATE TABLE public.generated_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  title text NOT NULL,
  format text NOT NULL CHECK (format IN ('xlsx','csv','pdf')),
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'generated',
  row_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.generated_reports TO authenticated;
GRANT ALL ON public.generated_reports TO service_role;
ALTER TABLE public.generated_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY reports_read ON public.generated_reports FOR SELECT TO authenticated USING (public.is_org_member(organization_id));
CREATE POLICY reports_write ON public.generated_reports FOR ALL TO authenticated USING (public.is_org_admin(organization_id)) WITH CHECK (public.is_org_admin(organization_id));

CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
CREATE TRIGGER organizations_updated BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER departments_updated BEFORE UPDATE ON public.departments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER members_updated BEFORE UPDATE ON public.members FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER github_updated BEFORE UPDATE ON public.github_monitoring FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER linkedin_updated BEFORE UPDATE ON public.linkedin_integrations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER settings_updated BEFORE UPDATE ON public.organization_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.create_organization(_name text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  INSERT INTO public.organizations(name, created_by) VALUES (trim(_name), auth.uid()) RETURNING id INTO _id;
  INSERT INTO public.user_roles(user_id, organization_id, role) VALUES (auth.uid(), _id, 'admin');
  INSERT INTO public.organization_settings(organization_id) VALUES (_id);
  RETURN _id;
END $$;
GRANT EXECUTE ON FUNCTION public.create_organization(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.import_members(_organization_id uuid, _filename text, _rows jsonb, _errors jsonb DEFAULT '[]'::jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _batch uuid; _row jsonb; _department uuid; _imported integer := 0; _skipped integer := 0;
BEGIN
  IF NOT public.is_org_admin(_organization_id) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  INSERT INTO public.import_batches(organization_id, created_by, filename, total_rows, errors)
  VALUES (_organization_id, auth.uid(), _filename, jsonb_array_length(_rows) + jsonb_array_length(_errors), _errors) RETURNING id INTO _batch;
  FOR _row IN SELECT * FROM jsonb_array_elements(_rows) LOOP
    INSERT INTO public.departments(organization_id, name) VALUES (_organization_id, trim(_row->>'department'))
    ON CONFLICT (organization_id, name) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO _department;
    INSERT INTO public.members(organization_id, serial_number, name, department_id, department_name, linkedin_url, github_url, github_username, source_import_batch_id)
    VALUES (_organization_id, (_row->>'serialNumber')::integer, trim(_row->>'name'), _department, trim(_row->>'department'), NULLIF(_row->>'linkedinUrl',''), NULLIF(_row->>'githubUrl',''), NULLIF(_row->>'githubUsername',''), _batch)
    ON CONFLICT (organization_id, serial_number) DO NOTHING;
    IF FOUND THEN
      _imported := _imported + 1;
    ELSE
      _skipped := _skipped + 1;
    END IF;
  END LOOP;
  UPDATE public.import_batches SET imported_rows = _imported, skipped_rows = _skipped, failed_rows = jsonb_array_length(_errors) WHERE id = _batch;
  INSERT INTO public.github_monitoring(member_id, organization_id, username, profile_url)
  SELECT id, organization_id, github_username, github_url FROM public.members WHERE source_import_batch_id = _batch AND github_username IS NOT NULL ON CONFLICT (member_id) DO NOTHING;
  INSERT INTO public.linkedin_integrations(member_id, organization_id, profile_url)
  SELECT id, organization_id, linkedin_url FROM public.members WHERE source_import_batch_id = _batch AND linkedin_url IS NOT NULL ON CONFLICT (member_id) DO NOTHING;
  RETURN jsonb_build_object('batchId', _batch, 'imported', _imported, 'skipped', _skipped, 'failed', jsonb_array_length(_errors));
END $$;
GRANT EXECUTE ON FUNCTION public.import_members(uuid, text, jsonb, jsonb) TO authenticated;