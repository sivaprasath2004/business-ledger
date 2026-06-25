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
      calendar_events: {
        Row: {
          all_day: boolean
          color: string | null
          created_at: string
          description: string | null
          done: boolean
          ends_at: string | null
          event_type: string
          id: string
          starts_at: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          all_day?: boolean
          color?: string | null
          created_at?: string
          description?: string | null
          done?: boolean
          ends_at?: string | null
          event_type?: string
          id?: string
          starts_at: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          all_day?: boolean
          color?: string | null
          created_at?: string
          description?: string | null
          done?: boolean
          ends_at?: string | null
          event_type?: string
          id?: string
          starts_at?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          address: string | null
          company: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          tags: string[] | null
          tax_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          company?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          tags?: string[] | null
          tax_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          company?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          tags?: string[] | null
          tax_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      invoices: {
        Row: {
          amount_paid: number
          created_at: string
          currency: string
          customer_id: string | null
          customer_name: string | null
          discount: number
          due_date: string | null
          id: string
          invoice_number: string
          issue_date: string
          items: Json
          notes: string | null
          status: string
          subtotal: number
          tax: number
          total: number
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_paid?: number
          created_at?: string
          currency?: string
          customer_id?: string | null
          customer_name?: string | null
          discount?: number
          due_date?: string | null
          id?: string
          invoice_number: string
          issue_date?: string
          items?: Json
          notes?: string | null
          status?: string
          subtotal?: number
          tax?: number
          total?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_paid?: number
          created_at?: string
          currency?: string
          customer_id?: string | null
          customer_name?: string | null
          discount?: number
          due_date?: string | null
          id?: string
          invoice_number?: string
          issue_date?: string
          items?: Json
          notes?: string | null
          status?: string
          subtotal?: number
          tax?: number
          total?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      ledger_entries: {
        Row: {
          amount: number
          archived: boolean
          category: string | null
          created_at: string
          currency: string
          customer_id: string | null
          description: string | null
          entry_date: string
          id: string
          ledger_number: string | null
          notes: string | null
          payment_method: string | null
          reference_number: string | null
          status: string
          tags: string[] | null
          tax: number
          type: string
          updated_at: string
          user_id: string
          vendor_id: string | null
        }
        Insert: {
          amount?: number
          archived?: boolean
          category?: string | null
          created_at?: string
          currency?: string
          customer_id?: string | null
          description?: string | null
          entry_date?: string
          id?: string
          ledger_number?: string | null
          notes?: string | null
          payment_method?: string | null
          reference_number?: string | null
          status?: string
          tags?: string[] | null
          tax?: number
          type: string
          updated_at?: string
          user_id: string
          vendor_id?: string | null
        }
        Update: {
          amount?: number
          archived?: boolean
          category?: string | null
          created_at?: string
          currency?: string
          customer_id?: string | null
          description?: string | null
          entry_date?: string
          id?: string
          ledger_number?: string | null
          notes?: string | null
          payment_method?: string | null
          reference_number?: string | null
          status?: string
          tags?: string[] | null
          tax?: number
          type?: string
          updated_at?: string
          user_id?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ledger_entries_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          category: string | null
          color: string | null
          content: string | null
          created_at: string
          id: string
          pinned: boolean
          tags: string[] | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          color?: string | null
          content?: string | null
          created_at?: string
          id?: string
          pinned?: boolean
          tags?: string[] | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          color?: string | null
          content?: string | null
          created_at?: string
          id?: string
          pinned?: boolean
          tags?: string[] | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          business_name: string | null
          created_at: string
          currency: string
          email: string | null
          full_name: string | null
          id: string
          locale: string
          onboarded: boolean
          profession: string | null
          theme: string
          tour_completed: boolean
          updated_at: string
          username: string | null
        }
        Insert: {
          business_name?: string | null
          created_at?: string
          currency?: string
          email?: string | null
          full_name?: string | null
          id: string
          locale?: string
          onboarded?: boolean
          profession?: string | null
          theme?: string
          tour_completed?: boolean
          updated_at?: string
          username?: string | null
        }
        Update: {
          business_name?: string | null
          created_at?: string
          currency?: string
          email?: string | null
          full_name?: string | null
          id?: string
          locale?: string
          onboarded?: boolean
          profession?: string | null
          theme?: string
          tour_completed?: boolean
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      vendors: {
        Row: {
          address: string | null
          company: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          tags: string[] | null
          tax_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          company?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          tags?: string[] | null
          tax_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          company?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          tags?: string[] | null
          tax_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
