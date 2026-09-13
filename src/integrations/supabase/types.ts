export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      departments: {
        Row: {
          created_at: string
          id: string
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_reports: {
        Row: {
          created_at: string
          created_by: string
          filters: Json
          format: string
          id: string
          organization_id: string
          row_count: number
          status: string
          title: string
        }
        Insert: {
          created_at?: string
          created_by: string
          filters?: Json
          format: string
          id?: string
          organization_id: string
          row_count?: number
          status?: string
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string
          filters?: Json
          format?: string
          id?: string
          organization_id?: string
          row_count?: number
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "generated_reports_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      github_monitoring: {
        Row: {
          account_created_at: string | null
          classification: Database["public"]["Enums"]["activity_status"]
          classification_reason: string
          data_source: string
          error_code: string | null
          error_message: string | null
          followers_count: number | null
          following_count: number | null
          last_observable_activity_at: string | null
          last_successful_at: string | null
          member_id: string
          monitored_at: string | null
          organization_id: string
          profile_url: string
          public_events: Json
          public_repos_count: number | null
          rate_limit_remaining: number | null
          raw_summary: Json
          repositories: Json
          threshold_days: number | null
          updated_at: string
          username: string
        }
        Insert: {
          account_created_at?: string | null
          classification?: Database["public"]["Enums"]["activity_status"]
          classification_reason?: string
          data_source?: string
          error_code?: string | null
          error_message?: string | null
          followers_count?: number | null
          following_count?: number | null
          last_observable_activity_at?: string | null
          last_successful_at?: string | null
          member_id: string
          monitored_at?: string | null
          organization_id: string
          profile_url: string
          public_events?: Json
          public_repos_count?: number | null
          rate_limit_remaining?: number | null
          raw_summary?: Json
          repositories?: Json
          threshold_days?: number | null
          updated_at?: string
          username: string
        }
        Update: {
          account_created_at?: string | null
          classification?: Database["public"]["Enums"]["activity_status"]
          classification_reason?: string
          data_source?: string
          error_code?: string | null
          error_message?: string | null
          followers_count?: number | null
          following_count?: number | null
          last_observable_activity_at?: string | null
          last_successful_at?: string | null
          member_id?: string
          monitored_at?: string | null
          organization_id?: string
          profile_url?: string
          public_events?: Json
          public_repos_count?: number | null
          rate_limit_remaining?: number | null
          raw_summary?: Json
          repositories?: Json
          threshold_days?: number | null
          updated_at?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "github_monitoring_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: true
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "github_monitoring_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      import_batches: {
        Row: {
          created_at: string
          created_by: string
          errors: Json
          failed_rows: number
          filename: string
          id: string
          imported_rows: number
          organization_id: string
          skipped_rows: number
          total_rows: number
        }
        Insert: {
          created_at?: string
          created_by: string
          errors?: Json
          failed_rows?: number
          filename: string
          id?: string
          imported_rows?: number
          organization_id: string
          skipped_rows?: number
          total_rows?: number
        }
        Update: {
          created_at?: string
          created_by?: string
          errors?: Json
          failed_rows?: number
          filename?: string
          id?: string
          imported_rows?: number
          organization_id?: string
          skipped_rows?: number
          total_rows?: number
        }
        Relationships: [
          {
            foreignKeyName: "import_batches_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      linkedin_integrations: {
        Row: {
          authorization_status: string
          authorized_activity: Json
          authorized_profile: Json
          data_availability: string
          error_message: string | null
          integration_status: string
          last_successful_sync_at: string | null
          member_id: string
          organization_id: string
          profile_url: string
          updated_at: string
        }
        Insert: {
          authorization_status?: string
          authorized_activity?: Json
          authorized_profile?: Json
          data_availability?: string
          error_message?: string | null
          integration_status?: string
          last_successful_sync_at?: string | null
          member_id: string
          organization_id: string
          profile_url: string
          updated_at?: string
        }
        Update: {
          authorization_status?: string
          authorized_activity?: Json
          authorized_profile?: Json
          data_availability?: string
          error_message?: string | null
          integration_status?: string
          last_successful_sync_at?: string | null
          member_id?: string
          organization_id?: string
          profile_url?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "linkedin_integrations_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: true
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "linkedin_integrations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      members: {
        Row: {
          created_at: string
          department_id: string | null
          department_name: string
          github_url: string | null
          github_username: string | null
          id: string
          linkedin_url: string | null
          name: string
          organization_id: string
          serial_number: number
          source_import_batch_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          department_id?: string | null
          department_name: string
          github_url?: string | null
          github_username?: string | null
          id?: string
          linkedin_url?: string | null
          name: string
          organization_id: string
          serial_number: number
          source_import_batch_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          department_id?: string | null
          department_name?: string
          github_url?: string | null
          github_username?: string | null
          id?: string
          linkedin_url?: string | null
          name?: string
          organization_id?: string
          serial_number?: number
          source_import_batch_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "members_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "members_source_import_batch_id_fkey"
            columns: ["source_import_batch_id"]
            isOneToOne: false
            referencedRelation: "import_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      monitoring_history: {
        Row: {
          classification: Database["public"]["Enums"]["activity_status"]
          data_source: string
          error_code: string | null
          error_message: string | null
          id: string
          job_id: string | null
          last_observable_activity_at: string | null
          member_id: string
          monitored_at: string
          organization_id: string
          platform: string
          reason: string
          success: boolean
          threshold_days: number | null
        }
        Insert: {
          classification: Database["public"]["Enums"]["activity_status"]
          data_source: string
          error_code?: string | null
          error_message?: string | null
          id?: string
          job_id?: string | null
          last_observable_activity_at?: string | null
          member_id: string
          monitored_at?: string
          organization_id: string
          platform: string
          reason: string
          success?: boolean
          threshold_days?: number | null
        }
        Update: {
          classification?: Database["public"]["Enums"]["activity_status"]
          data_source?: string
          error_code?: string | null
          error_message?: string | null
          id?: string
          job_id?: string | null
          last_observable_activity_at?: string | null
          member_id?: string
          monitored_at?: string
          organization_id?: string
          platform?: string
          reason?: string
          success?: boolean
          threshold_days?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "monitoring_history_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "monitoring_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monitoring_history_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monitoring_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      monitoring_jobs: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string
          error_message: string | null
          failed_profiles: number
          id: string
          member_ids: string[]
          organization_id: string
          platform: string
          processed_profiles: number
          retry_of: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["job_status"]
          successful_profiles: number
          total_profiles: number
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by: string
          error_message?: string | null
          failed_profiles?: number
          id?: string
          member_ids?: string[]
          organization_id: string
          platform: string
          processed_profiles?: number
          retry_of?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          successful_profiles?: number
          total_profiles?: number
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string
          error_message?: string | null
          failed_profiles?: number
          id?: string
          member_ids?: string[]
          organization_id?: string
          platform?: string
          processed_profiles?: number
          retry_of?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          successful_profiles?: number
          total_profiles?: number
        }
        Relationships: [
          {
            foreignKeyName: "monitoring_jobs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monitoring_jobs_retry_of_fkey"
            columns: ["retry_of"]
            isOneToOne: false
            referencedRelation: "monitoring_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_settings: {
        Row: {
          activity_threshold_days: number
          data_retention_days: number
          default_report_title: string
          github_configured: boolean
          linkedin_configured: boolean
          monitoring_frequency: string
          organization_id: string
          timezone: string
          updated_at: string
        }
        Insert: {
          activity_threshold_days?: number
          data_retention_days?: number
          default_report_title?: string
          github_configured?: boolean
          linkedin_configured?: boolean
          monitoring_frequency?: string
          organization_id: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          activity_threshold_days?: number
          data_retention_days?: number
          default_report_title?: string
          github_configured?: boolean
          linkedin_configured?: boolean
          monitoring_frequency?: string
          organization_id?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          created_by: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_organization: { Args: { _name: string }; Returns: string }
      import_members: {
        Args: {
          _errors?: Json
          _filename: string
          _organization_id: string
          _rows: Json
        }
        Returns: Json
      }
      is_org_admin: {
        Args: { _organization_id: string; _user_id?: string }
        Returns: boolean
      }
      is_org_member: {
        Args: { _organization_id: string; _user_id?: string }
        Returns: boolean
      }
    }
    Enums: {
      activity_status:
        | "active"
        | "inactive"
        | "no_observable_activity"
        | "data_unavailable"
        | "monitoring_failed"
        | "not_monitored"
      app_role: "admin" | "user"
      job_status:
        | "queued"
        | "running"
        | "completed"
        | "partial"
        | "failed"
        | "cancelled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      activity_status: [
        "active",
        "inactive",
        "no_observable_activity",
        "data_unavailable",
        "monitoring_failed",
        "not_monitored",
      ],
      app_role: ["admin", "user"],
      job_status: [
        "queued",
        "running",
        "completed",
        "partial",
        "failed",
        "cancelled",
      ],
    },
  },
} as const
