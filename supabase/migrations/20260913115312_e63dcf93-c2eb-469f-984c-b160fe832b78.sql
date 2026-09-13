CREATE OR REPLACE FUNCTION public.import_members(_organization_id uuid, _filename text, _rows jsonb, _errors jsonb DEFAULT '[]'::jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, private AS $$
DECLARE _batch uuid; _row jsonb; _department uuid; _member uuid; _imported integer := 0; _skipped integer := 0;
BEGIN
  IF NOT private.is_org_admin(_organization_id) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  INSERT INTO public.import_batches(organization_id, created_by, filename, total_rows, errors)
  VALUES (_organization_id, auth.uid(), _filename, jsonb_array_length(_rows) + jsonb_array_length(_errors), _errors) RETURNING id INTO _batch;
  FOR _row IN SELECT * FROM jsonb_array_elements(_rows) LOOP
    BEGIN
      INSERT INTO public.departments(organization_id, name) VALUES (_organization_id, trim(_row->>'department'))
      ON CONFLICT (organization_id, name) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO _department;
      INSERT INTO public.members(organization_id, serial_number, name, department_id, department_name, linkedin_url, github_url, github_username, source_import_batch_id)
      VALUES (_organization_id, (_row->>'serialNumber')::integer, trim(_row->>'name'), _department, trim(_row->>'department'), NULLIF(_row->>'linkedinUrl',''), NULLIF(_row->>'githubUrl',''), NULLIF(_row->>'githubUsername',''), _batch)
      RETURNING id INTO _member;
      IF NULLIF(_row->>'githubUsername','') IS NOT NULL THEN
        INSERT INTO public.github_monitoring(member_id, organization_id, username, profile_url)
        VALUES (_member, _organization_id, _row->>'githubUsername', _row->>'githubUrl');
      END IF;
      IF NULLIF(_row->>'linkedinUrl','') IS NOT NULL THEN
        INSERT INTO public.linkedin_integrations(member_id, organization_id, profile_url)
        VALUES (_member, _organization_id, _row->>'linkedinUrl');
      END IF;
      _imported := _imported + 1;
    EXCEPTION WHEN unique_violation THEN
      _skipped := _skipped + 1;
    END;
  END LOOP;
  UPDATE public.import_batches SET imported_rows = _imported, skipped_rows = _skipped, failed_rows = jsonb_array_length(_errors) WHERE id = _batch;
  RETURN jsonb_build_object('batchId', _batch, 'imported', _imported, 'skipped', _skipped, 'failed', jsonb_array_length(_errors));
END $$;

CREATE OR REPLACE FUNCTION private.sync_member_profiles()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
BEGIN
  IF NEW.github_username IS NULL OR NEW.github_url IS NULL THEN
    DELETE FROM public.github_monitoring WHERE member_id = NEW.id;
  ELSE
    INSERT INTO public.github_monitoring(member_id, organization_id, username, profile_url)
    VALUES (NEW.id, NEW.organization_id, NEW.github_username, NEW.github_url)
    ON CONFLICT (member_id) DO UPDATE SET username = EXCLUDED.username, profile_url = EXCLUDED.profile_url;
  END IF;
  IF NEW.linkedin_url IS NULL THEN
    DELETE FROM public.linkedin_integrations WHERE member_id = NEW.id;
  ELSE
    INSERT INTO public.linkedin_integrations(member_id, organization_id, profile_url)
    VALUES (NEW.id, NEW.organization_id, NEW.linkedin_url)
    ON CONFLICT (member_id) DO UPDATE SET profile_url = EXCLUDED.profile_url;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.sync_member_profiles() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER sync_member_profiles AFTER UPDATE OF github_url, github_username, linkedin_url ON public.members FOR EACH ROW EXECUTE FUNCTION private.sync_member_profiles();