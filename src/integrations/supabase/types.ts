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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      department_budgets: {
        Row: {
          created_at: string | null
          department: Database["public"]["Enums"]["department_type"]
          fiscal_year: number
          id: string
          total_budget: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          department: Database["public"]["Enums"]["department_type"]
          fiscal_year: number
          id?: string
          total_budget: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          department?: Database["public"]["Enums"]["department_type"]
          fiscal_year?: number
          id?: string
          total_budget?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          created_at: string | null
          id: string
          payment_date: string
          pop_file_name: string
          processed_by: string
          requisition_id: string
          status: Database["public"]["Enums"]["payment_status"]
        }
        Insert: {
          created_at?: string | null
          id?: string
          payment_date: string
          pop_file_name: string
          processed_by: string
          requisition_id: string
          status?: Database["public"]["Enums"]["payment_status"]
        }
        Update: {
          created_at?: string | null
          id?: string
          payment_date?: string
          pop_file_name?: string
          processed_by?: string
          requisition_id?: string
          status?: Database["public"]["Enums"]["payment_status"]
        }
        Relationships: [
          {
            foreignKeyName: "payments_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_requisition_id_fkey"
            columns: ["requisition_id"]
            isOneToOne: false
            referencedRelation: "requisitions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          department: Database["public"]["Enums"]["department_type"]
          email: string
          full_name: string
          id: string
        }
        Insert: {
          created_at?: string | null
          department: Database["public"]["Enums"]["department_type"]
          email: string
          full_name: string
          id: string
        }
        Update: {
          created_at?: string | null
          department?: Database["public"]["Enums"]["department_type"]
          email?: string
          full_name?: string
          id?: string
        }
        Relationships: []
      }
      requisition_documents: {
        Row: {
          file_name: string
          file_url: string
          id: string
          requisition_id: string
          uploaded_at: string | null
        }
        Insert: {
          file_name: string
          file_url: string
          id?: string
          requisition_id: string
          uploaded_at?: string | null
        }
        Update: {
          file_name?: string
          file_url?: string
          id?: string
          requisition_id?: string
          uploaded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "requisition_documents_requisition_id_fkey"
            columns: ["requisition_id"]
            isOneToOne: false
            referencedRelation: "requisitions"
            referencedColumns: ["id"]
          },
        ]
      }
      requisitions: {
        Row: {
          amount: number
          approved_by: string | null
          approved_date: string | null
          approver_comments: string | null
          budget_code: string
          chosen_requisition: string
          chosen_supplier_id: string
          created_at: string | null
          currency: Database["public"]["Enums"]["currency_type"]
          department: Database["public"]["Enums"]["department_type"]
          description: string
          deviation_reason: string | null
          id: string
          other_supplier_1_id: string | null
          other_supplier_2_id: string | null
          status: Database["public"]["Enums"]["requisition_status"]
          submitted_by: string
          submitted_date: string | null
          tax_clearance_id: string | null
          title: string
          type: Database["public"]["Enums"]["requisition_type"]
          usd_convertible: number | null
        }
        Insert: {
          amount: number
          approved_by?: string | null
          approved_date?: string | null
          approver_comments?: string | null
          budget_code: string
          chosen_requisition: string
          chosen_supplier_id: string
          created_at?: string | null
          currency: Database["public"]["Enums"]["currency_type"]
          department: Database["public"]["Enums"]["department_type"]
          description: string
          deviation_reason?: string | null
          id?: string
          other_supplier_1_id?: string | null
          other_supplier_2_id?: string | null
          status?: Database["public"]["Enums"]["requisition_status"]
          submitted_by: string
          submitted_date?: string | null
          tax_clearance_id?: string | null
          title: string
          type?: Database["public"]["Enums"]["requisition_type"]
          usd_convertible?: number | null
        }
        Update: {
          amount?: number
          approved_by?: string | null
          approved_date?: string | null
          approver_comments?: string | null
          budget_code?: string
          chosen_requisition?: string
          chosen_supplier_id?: string
          created_at?: string | null
          currency?: Database["public"]["Enums"]["currency_type"]
          department?: Database["public"]["Enums"]["department_type"]
          description?: string
          deviation_reason?: string | null
          id?: string
          other_supplier_1_id?: string | null
          other_supplier_2_id?: string | null
          status?: Database["public"]["Enums"]["requisition_status"]
          submitted_by?: string
          submitted_date?: string | null
          tax_clearance_id?: string | null
          title?: string
          type?: Database["public"]["Enums"]["requisition_type"]
          usd_convertible?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "requisitions_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requisitions_chosen_supplier_id_fkey"
            columns: ["chosen_supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requisitions_other_supplier_1_id_fkey"
            columns: ["other_supplier_1_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requisitions_other_supplier_2_id_fkey"
            columns: ["other_supplier_2_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requisitions_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requisitions_tax_clearance_id_fkey"
            columns: ["tax_clearance_id"]
            isOneToOne: false
            referencedRelation: "tax_clearances"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          contact_info: string
          created_at: string | null
          icaz_number: string
          id: string
          name: string
          status: Database["public"]["Enums"]["supplier_status"]
        }
        Insert: {
          contact_info: string
          created_at?: string | null
          icaz_number: string
          id?: string
          name: string
          status?: Database["public"]["Enums"]["supplier_status"]
        }
        Update: {
          contact_info?: string
          created_at?: string | null
          icaz_number?: string
          id?: string
          name?: string
          status?: Database["public"]["Enums"]["supplier_status"]
        }
        Relationships: []
      }
      tax_clearances: {
        Row: {
          created_at: string | null
          file_name: string
          id: string
          quarter: string
          supplier_id: string
          valid_from: string
          valid_to: string
          year: string
        }
        Insert: {
          created_at?: string | null
          file_name: string
          id?: string
          quarter: string
          supplier_id: string
          valid_from: string
          valid_to: string
          year: string
        }
        Update: {
          created_at?: string | null
          file_name?: string
          id?: string
          quarter?: string
          supplier_id?: string
          valid_from?: string
          valid_to?: string
          year?: string
        }
        Relationships: [
          {
            foreignKeyName: "tax_clearances_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "preparer"
        | "hod"
        | "finance_manager"
        | "technical_director"
        | "accountant"
        | "ceo"
        | "admin"
        | "hr"
      currency_type: "USD" | "ZWG" | "GBP" | "EUR"
      department_type:
        | "Education"
        | "IT"
        | "Marketing and PR"
        | "Technical"
        | "HR"
        | "Finance"
        | "CEO"
      payment_status: "paid" | "pending"
      requisition_status:
        | "pending"
        | "approved"
        | "approved_wait"
        | "completed"
        | "rejected"
      requisition_type: "standard" | "deviation"
      supplier_status: "active" | "inactive"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      app_role: [
        "preparer",
        "hod",
        "finance_manager",
        "technical_director",
        "accountant",
        "ceo",
        "admin",
        "hr",
      ],
      currency_type: ["USD", "ZWG", "GBP", "EUR"],
      department_type: [
        "Education",
        "IT",
        "Marketing and PR",
        "Technical",
        "HR",
        "Finance",
        "CEO",
      ],
      payment_status: ["paid", "pending"],
      requisition_status: [
        "pending",
        "approved",
        "approved_wait",
        "completed",
        "rejected",
      ],
      requisition_type: ["standard", "deviation"],
      supplier_status: ["active", "inactive"],
    },
  },
} as const
