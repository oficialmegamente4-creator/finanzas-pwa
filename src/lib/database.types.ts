export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

type Table<Row, Insert, Update> = {
  Row: Row
  Insert: Insert
  Update: Update
  Relationships: []
}

export interface Database {
  public: {
    Tables: {
      profiles: Table<
        { user_id: string; currency: string; theme: string; created_at: string; updated_at: string },
        { user_id: string; currency?: string; theme?: string; created_at?: string; updated_at?: string },
        { currency?: string; theme?: string; updated_at?: string }
      >
      categories: Table<
        { user_id: string; type: string; name: string; color: string; created_at: string },
        { user_id: string; type: string; name: string; color?: string; created_at?: string },
        { color?: string }
      >
      transactions: Table<
        { user_id: string; id: string; type: string; description: string; amount: number; category: string; date: string; created_at: string; updated_at: string },
        { user_id: string; id: string; type: string; description: string; amount: number; category: string; date: string; created_at?: string; updated_at?: string },
        { type?: string; description?: string; amount?: number; category?: string; date?: string; updated_at?: string }
      >
      budgets: Table<
        { user_id: string; id: string; category_type: string; category: string; period_start: string; amount: number; created_at: string; updated_at: string },
        { user_id: string; id: string; category_type?: string; category: string; period_start: string; amount: number; created_at?: string; updated_at?: string },
        { category_type?: string; category?: string; period_start?: string; amount?: number; updated_at?: string }
      >
    }
    Views: Record<string, never>
    Functions: {
      clear_my_finance_data: { Args: Record<string, never>; Returns: undefined }
      replace_my_finance_data: { Args: { p_transactions: Json; p_budgets: Json; p_currency: string; p_theme: string }; Returns: undefined }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

export type DbTransaction = Database['public']['Tables']['transactions']['Row']
export type DbCategory = Database['public']['Tables']['categories']['Row']
export type DbBudget = Database['public']['Tables']['budgets']['Row']
