CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.is_org_member(_organization_id uuid, _user_id uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, private AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE organization_id = _organization_id AND user_id = _user_id)
$$;
CREATE OR REPLACE FUNCTION private.is_org_admin(_organization_id uuid, _user_id uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, private AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE organization_id = _organization_id AND user_id = _user_id AND role = 'admin')
$$;
REVOKE ALL ON FUNCTION private.is_org_member(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.is_org_admin(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_org_member(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_org_admin(uuid, uuid) TO authenticated, service_role;

ALTER POLICY organizations_read ON public.organizations USING (private.is_org_member(id) OR created_by = auth.uid());
ALTER POLICY organizations_update ON public.organizations USING (private.is_org_admin(id)) WITH CHECK (private.is_org_admin(id));
ALTER POLICY organizations_delete ON public.organizations USING (private.is_org_admin(id));
ALTER POLICY roles_read ON public.user_roles USING (user_id = auth.uid() OR private.is_org_admin(organization_id));
ALTER POLICY roles_create ON public.user_roles WITH CHECK (private.is_org_admin(organization_id));
ALTER POLICY roles_update ON public.user_roles USING (private.is_org_admin(organization_id)) WITH CHECK (private.is_org_admin(organization_id));
ALTER POLICY roles_delete ON public.user_roles USING (private.is_org_admin(organization_id));
ALTER POLICY departments_read ON public.departments USING (private.is_org_member(organization_id));
ALTER POLICY departments_write ON public.departments USING (private.is_org_admin(organization_id)) WITH CHECK (private.is_org_admin(organization_id));
ALTER POLICY settings_read ON public.organization_settings USING (private.is_org_member(organization_id));
ALTER POLICY settings_write ON public.organization_settings USING (private.is_org_admin(organization_id)) WITH CHECK (private.is_org_admin(organization_id));
ALTER POLICY imports_read ON public.import_batches USING (private.is_org_member(organization_id));
ALTER POLICY imports_write ON public.import_batches USING (private.is_org_admin(organization_id)) WITH CHECK (private.is_org_admin(organization_id));
ALTER POLICY members_read ON public.members USING (private.is_org_member(organization_id));
ALTER POLICY members_write ON public.members USING (private.is_org_admin(organization_id)) WITH CHECK (private.is_org_admin(organization_id));
ALTER POLICY github_read ON public.github_monitoring USING (private.is_org_member(organization_id));
ALTER POLICY github_write ON public.github_monitoring USING (private.is_org_admin(organization_id)) WITH CHECK (private.is_org_admin(organization_id));
ALTER POLICY linkedin_read ON public.linkedin_integrations USING (private.is_org_member(organization_id));
ALTER POLICY linkedin_write ON public.linkedin_integrations USING (private.is_org_admin(organization_id)) WITH CHECK (private.is_org_admin(organization_id));
ALTER POLICY jobs_read ON public.monitoring_jobs USING (private.is_org_member(organization_id));
ALTER POLICY jobs_write ON public.monitoring_jobs USING (private.is_org_admin(organization_id)) WITH CHECK (private.is_org_admin(organization_id));
ALTER POLICY history_read ON public.monitoring_history USING (private.is_org_member(organization_id));
ALTER POLICY history_write ON public.monitoring_history USING (private.is_org_admin(organization_id)) WITH CHECK (private.is_org_admin(organization_id));
ALTER POLICY reports_read ON public.generated_reports USING (private.is_org_member(organization_id));
ALTER POLICY reports_write ON public.generated_reports USING (private.is_org_admin(organization_id)) WITH CHECK (private.is_org_admin(organization_id));

CREATE OR REPLACE FUNCTION private.bootstrap_organization_admin()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
BEGIN
  INSERT INTO public.user_roles(user_id, organization_id, role) VALUES (NEW.created_by, NEW.id, 'admin');
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.bootstrap_organization_admin() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER bootstrap_organization_admin AFTER INSERT ON public.organizations FOR EACH ROW EXECUTE FUNCTION private.bootstrap_organization_admin();

CREATE OR REPLACE FUNCTION public.create_organization(_name text)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, private AS $$
DECLARE _id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  INSERT INTO public.organizations(name, created_by) VALUES (trim(_name), auth.uid()) RETURNING id INTO _id;
  INSERT INTO public.organization_settings(organization_id) VALUES (_id);
  RETURN _id;
END $$;
REVOKE ALL ON FUNCTION public.create_organization(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_organization(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.import_members(_organization_id uuid, _filename text, _rows jsonb, _errors jsonb DEFAULT '[]'::jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, private AS $$
DECLARE _batch uuid; _row jsonb; _department uuid; _imported integer := 0; _skipped integer := 0;
BEGIN
  IF NOT private.is_org_admin(_organization_id) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  INSERT INTO public.import_batches(organization_id, created_by, filename, total_rows, errors)
  VALUES (_organization_id, auth.uid(), _filename, jsonb_array_length(_rows) + jsonb_array_length(_errors), _errors) RETURNING id INTO _batch;
  FOR _row IN SELECT * FROM jsonb_array_elements(_rows) LOOP
    INSERT INTO public.departments(organization_id, name) VALUES (_organization_id, trim(_row->>'department'))
    ON CONFLICT (organization_id, name) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO _department;
    INSERT INTO public.members(organization_id, serial_number, name, department_id, department_name, linkedin_url, github_url, github_username, source_import_batch_id)
    VALUES (_organization_id, (_row->>'serialNumber')::integer, trim(_row->>'name'), _department, trim(_row->>'department'), NULLIF(_row->>'linkedinUrl',''), NULLIF(_row->>'githubUrl',''), NULLIF(_row->>'githubUsername',''), _batch)
    ON CONFLICT (organization_id, serial_number) DO NOTHING;
    IF FOUND THEN _imported := _imported + 1; ELSE _skipped := _skipped + 1; END IF;
  END LOOP;
  UPDATE public.import_batches SET imported_rows = _imported, skipped_rows = _skipped, failed_rows = jsonb_array_length(_errors) WHERE id = _batch;
  INSERT INTO public.github_monitoring(member_id, organization_id, username, profile_url)
  SELECT id, organization_id, github_username, github_url FROM public.members WHERE source_import_batch_id = _batch AND github_username IS NOT NULL ON CONFLICT (member_id) DO NOTHING;
  INSERT INTO public.linkedin_integrations(member_id, organization_id, profile_url)
  SELECT id, organization_id, linkedin_url FROM public.members WHERE source_import_batch_id = _batch AND linkedin_url IS NOT NULL ON CONFLICT (member_id) DO NOTHING;
  RETURN jsonb_build_object('batchId', _batch, 'imported', _imported, 'skipped', _skipped, 'failed', jsonb_array_length(_errors));
END $$;
REVOKE ALL ON FUNCTION public.import_members(uuid, text, jsonb, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.import_members(uuid, text, jsonb, jsonb) TO authenticated;

DROP FUNCTION public.is_org_member(uuid, uuid);
DROP FUNCTION public.is_org_admin(uuid, uuid);