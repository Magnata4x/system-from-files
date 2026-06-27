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
      admin_audit_log: {
        Row: {
          actor_id: string
          created_at: string
          field_name: string
          id: string
          new_value: Json | null
          old_value: Json | null
          table_name: string
          target_user_id: string
        }
        Insert: {
          actor_id: string
          created_at?: string
          field_name: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          table_name: string
          target_user_id: string
        }
        Update: {
          actor_id?: string
          created_at?: string
          field_name?: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          table_name?: string
          target_user_id?: string
        }
        Relationships: []
      }
      bot4x_configs: {
        Row: {
          active: boolean
          active_capital: number | null
          ai_score_min: number | null
          allocation_pct: number | null
          api_key_set: boolean | null
          avoid_pairs: Json
          circuit_breaker: string
          created_at: string
          daily_pnl: number | null
          emergency_triggered_at: string | null
          exchange: string | null
          fomo_limit: number | null
          id: string
          leverage: number | null
          open_slots: number | null
          preferred_pairs: Json
          profile: string
          profit_lock_triggered_at: string | null
          rsi_threshold_high: number | null
          rsi_threshold_low: number | null
          sl_pct: number | null
          total_capital: number | null
          total_trades_today: number | null
          tp_pct: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          active_capital?: number | null
          ai_score_min?: number | null
          allocation_pct?: number | null
          api_key_set?: boolean | null
          avoid_pairs?: Json
          circuit_breaker?: string
          created_at?: string
          daily_pnl?: number | null
          emergency_triggered_at?: string | null
          exchange?: string | null
          fomo_limit?: number | null
          id?: string
          leverage?: number | null
          open_slots?: number | null
          preferred_pairs?: Json
          profile?: string
          profit_lock_triggered_at?: string | null
          rsi_threshold_high?: number | null
          rsi_threshold_low?: number | null
          sl_pct?: number | null
          total_capital?: number | null
          total_trades_today?: number | null
          tp_pct?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          active_capital?: number | null
          ai_score_min?: number | null
          allocation_pct?: number | null
          api_key_set?: boolean | null
          avoid_pairs?: Json
          circuit_breaker?: string
          created_at?: string
          daily_pnl?: number | null
          emergency_triggered_at?: string | null
          exchange?: string | null
          fomo_limit?: number | null
          id?: string
          leverage?: number | null
          open_slots?: number | null
          preferred_pairs?: Json
          profile?: string
          profit_lock_triggered_at?: string | null
          rsi_threshold_high?: number | null
          rsi_threshold_low?: number | null
          sl_pct?: number | null
          total_capital?: number | null
          total_trades_today?: number | null
          tp_pct?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      bot4x_trades: {
        Row: {
          accumulated: number
          created_at: string
          day: string
          entry: number
          hour: number | null
          id: string
          leverage: number | null
          motivo: string | null
          pair: string
          pnl: number
          pnl_pct: number
          profile: string | null
          result: string
          side: string
          stop: number | null
          target: number | null
          user_id: string
        }
        Insert: {
          accumulated?: number
          created_at?: string
          day: string
          entry: number
          hour?: number | null
          id: string
          leverage?: number | null
          motivo?: string | null
          pair: string
          pnl?: number
          pnl_pct?: number
          profile?: string | null
          result: string
          side: string
          stop?: number | null
          target?: number | null
          user_id: string
        }
        Update: {
          accumulated?: number
          created_at?: string
          day?: string
          entry?: number
          hour?: number | null
          id?: string
          leverage?: number | null
          motivo?: string | null
          pair?: string
          pnl?: number
          pnl_pct?: number
          profile?: string | null
          result?: string
          side?: string
          stop?: number | null
          target?: number | null
          user_id?: string
        }
        Relationships: []
      }
      calibrator_runs: {
        Row: {
          created_at: string
          full_result: Json | null
          id: string
          initial_balance: number
          leverage: number
          losses: number
          max_drawdown: number
          period_days: number
          pnl: number
          pnl_pct: number
          profile: string
          sharpe: number
          symbol: string
          trades: number
          user_id: string
          win_rate: number
          wins: number
        }
        Insert: {
          created_at?: string
          full_result?: Json | null
          id?: string
          initial_balance: number
          leverage?: number
          losses?: number
          max_drawdown?: number
          period_days: number
          pnl?: number
          pnl_pct?: number
          profile: string
          sharpe?: number
          symbol: string
          trades?: number
          user_id: string
          win_rate?: number
          wins?: number
        }
        Update: {
          created_at?: string
          full_result?: Json | null
          id?: string
          initial_balance?: number
          leverage?: number
          losses?: number
          max_drawdown?: number
          period_days?: number
          pnl?: number
          pnl_pct?: number
          profile?: string
          sharpe?: number
          symbol?: string
          trades?: number
          user_id?: string
          win_rate?: number
          wins?: number
        }
        Relationships: []
      }
      copilot_history: {
        Row: {
          agent: string | null
          content: string
          created_at: string
          expires_at: string | null
          id: string
          metadata: Json | null
          role: string
          user_id: string
        }
        Insert: {
          agent?: string | null
          content: string
          created_at?: string
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          role: string
          user_id: string
        }
        Update: {
          agent?: string | null
          content?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          avg_win_rate: number | null
          best_session: string | null
          bio: string | null
          country: string | null
          created_at: string
          dna_consistency: number | null
          dna_discipline: number | null
          dna_emotional_control: number | null
          dna_risk_control: number | null
          dna_timing: number | null
          dna_updated_at: string | null
          drawdown_today: number | null
          email: string | null
          experience: string | null
          full_name: string | null
          goal: string | null
          id: string
          markets: string[] | null
          onboarding_completed: boolean
          open_loss_pct: number | null
          operations_today: number | null
          overtrading_risk: boolean | null
          phone: string | null
          phone_country: string | null
          plan_tier: string | null
          recent_losses: number | null
          timezone: string | null
          trading_style: string | null
          updated_at: string
          username: string | null
          website: string | null
          worst_session: string | null
        }
        Insert: {
          avatar_url?: string | null
          avg_win_rate?: number | null
          best_session?: string | null
          bio?: string | null
          country?: string | null
          created_at?: string
          dna_consistency?: number | null
          dna_discipline?: number | null
          dna_emotional_control?: number | null
          dna_risk_control?: number | null
          dna_timing?: number | null
          dna_updated_at?: string | null
          drawdown_today?: number | null
          email?: string | null
          experience?: string | null
          full_name?: string | null
          goal?: string | null
          id: string
          markets?: string[] | null
          onboarding_completed?: boolean
          open_loss_pct?: number | null
          operations_today?: number | null
          overtrading_risk?: boolean | null
          phone?: string | null
          phone_country?: string | null
          plan_tier?: string | null
          recent_losses?: number | null
          timezone?: string | null
          trading_style?: string | null
          updated_at?: string
          username?: string | null
          website?: string | null
          worst_session?: string | null
        }
        Update: {
          avatar_url?: string | null
          avg_win_rate?: number | null
          best_session?: string | null
          bio?: string | null
          country?: string | null
          created_at?: string
          dna_consistency?: number | null
          dna_discipline?: number | null
          dna_emotional_control?: number | null
          dna_risk_control?: number | null
          dna_timing?: number | null
          dna_updated_at?: string | null
          drawdown_today?: number | null
          email?: string | null
          experience?: string | null
          full_name?: string | null
          goal?: string | null
          id?: string
          markets?: string[] | null
          onboarding_completed?: boolean
          open_loss_pct?: number | null
          operations_today?: number | null
          overtrading_risk?: boolean | null
          phone?: string | null
          phone_country?: string | null
          plan_tier?: string | null
          recent_losses?: number | null
          timezone?: string | null
          trading_style?: string | null
          updated_at?: string
          username?: string | null
          website?: string | null
          worst_session?: string | null
        }
        Relationships: []
      }
      rate_limit_policies: {
        Row: {
          action: string
          created_at: string
          description: string | null
          max_attempts: number
          window_seconds: number
        }
        Insert: {
          action: string
          created_at?: string
          description?: string | null
          max_attempts: number
          window_seconds: number
        }
        Update: {
          action?: string
          created_at?: string
          description?: string | null
          max_attempts?: number
          window_seconds?: number
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          action: string
          count: number
          user_id: string
          window_start: string
        }
        Insert: {
          action: string
          count?: number
          user_id: string
          window_start?: string
        }
        Update: {
          action?: string
          count?: number
          user_id?: string
          window_start?: string
        }
        Relationships: []
      }
      rate_limits_by_key: {
        Row: {
          action: string
          count: number
          key: string
          window_start: string
        }
        Insert: {
          action: string
          count?: number
          key: string
          window_start?: string
        }
        Update: {
          action?: string
          count?: number
          key?: string
          window_start?: string
        }
        Relationships: []
      }
      signals: {
        Row: {
          ai_reasoning: string | null
          ai_score: number | null
          channel_zone: string | null
          confirmations: string | null
          created_at: string
          entry_price: number
          expires_at: string | null
          id: string
          invalidations: string | null
          liquidity_grab: boolean | null
          pair: string
          rsi: number | null
          score: number
          side: string
          status: string
          stop_loss: number | null
          take_profit1: number | null
          take_profit2: number | null
          timeframe: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          ai_reasoning?: string | null
          ai_score?: number | null
          channel_zone?: string | null
          confirmations?: string | null
          created_at?: string
          entry_price: number
          expires_at?: string | null
          id?: string
          invalidations?: string | null
          liquidity_grab?: boolean | null
          pair: string
          rsi?: number | null
          score: number
          side: string
          status?: string
          stop_loss?: number | null
          take_profit1?: number | null
          take_profit2?: number | null
          timeframe?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          ai_reasoning?: string | null
          ai_score?: number | null
          channel_zone?: string | null
          confirmations?: string | null
          created_at?: string
          entry_price?: number
          expires_at?: string | null
          id?: string
          invalidations?: string | null
          liquidity_grab?: boolean | null
          pair?: string
          rsi?: number | null
          score?: number
          side?: string
          status?: string
          stop_loss?: number | null
          take_profit1?: number | null
          take_profit2?: number | null
          timeframe?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      trade_outbox: {
        Row: {
          attempts: number
          created_at: string
          id: string
          last_error: string | null
          processed_at: string | null
          status: string
          trade_data: Json
          user_id: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          id?: string
          last_error?: string | null
          processed_at?: string | null
          status?: string
          trade_data: Json
          user_id: string
        }
        Update: {
          attempts?: number
          created_at?: string
          id?: string
          last_error?: string | null
          processed_at?: string | null
          status?: string
          trade_data?: Json
          user_id?: string
        }
        Relationships: []
      }
      user_notifications: {
        Row: {
          body: string | null
          created_at: string
          dismissed: boolean
          id: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          dismissed?: boolean
          id: string
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          dismissed?: boolean
          id?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          compact_pill: boolean
          onboarding_done: boolean
          updated_at: string
          user_id: string
          wishlist: string[]
        }
        Insert: {
          compact_pill?: boolean
          onboarding_done?: boolean
          updated_at?: string
          user_id: string
          wishlist?: string[]
        }
        Update: {
          compact_pill?: boolean
          onboarding_done?: boolean
          updated_at?: string
          user_id?: string
          wishlist?: string[]
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_rate_limit: {
        Args: { p_action: string; p_max: number; p_user_id: string }
        Returns: boolean
      }
      check_rate_limit_by_key: {
        Args: {
          p_action: string
          p_key: string
          p_max: number
          p_window_seconds?: number
        }
        Returns: boolean
      }
      cleanup_old_user_notifications: {
        Args: { dismissed_after_days?: number; max_age_days?: number }
        Returns: number
      }
      cleanup_rate_limits: { Args: never; Returns: number }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      purge_expired_copilot_history: { Args: never; Returns: number }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
