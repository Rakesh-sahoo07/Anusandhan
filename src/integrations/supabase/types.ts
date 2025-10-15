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
      nft_listings: {
        Row: {
          delisted_at: string | null
          id: string
          listed_at: string
          listing_status: Database["public"]["Enums"]["listing_status"]
          price_pyusd: number
          project_id: string
          seller_wallet_address: string
          sold_at: string | null
          transaction_hash: string | null
        }
        Insert: {
          delisted_at?: string | null
          id?: string
          listed_at?: string
          listing_status?: Database["public"]["Enums"]["listing_status"]
          price_pyusd: number
          project_id: string
          seller_wallet_address: string
          sold_at?: string | null
          transaction_hash?: string | null
        }
        Update: {
          delisted_at?: string | null
          id?: string
          listed_at?: string
          listing_status?: Database["public"]["Enums"]["listing_status"]
          price_pyusd?: number
          project_id?: string
          seller_wallet_address?: string
          sold_at?: string | null
          transaction_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nft_listings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_snapshots: {
        Row: {
          created_at: string
          id: string
          project_id: string
          snapshot_data: Json
          version: number
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: string
          snapshot_data: Json
          version?: number
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string
          snapshot_data?: Json
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "project_snapshots_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string
          creator_wallet_address: string
          description: string | null
          id: string
          lighthouse_cid: string | null
          metadata_cid: string | null
          name: string
          nft_contract_address: string | null
          nft_status: Database["public"]["Enums"]["nft_status"]
          nft_token_id: string | null
          owner_wallet_address: string
          updated_at: string
          view_count: number | null
        }
        Insert: {
          created_at?: string
          creator_wallet_address: string
          description?: string | null
          id?: string
          lighthouse_cid?: string | null
          metadata_cid?: string | null
          name: string
          nft_contract_address?: string | null
          nft_status?: Database["public"]["Enums"]["nft_status"]
          nft_token_id?: string | null
          owner_wallet_address: string
          updated_at?: string
          view_count?: number | null
        }
        Update: {
          created_at?: string
          creator_wallet_address?: string
          description?: string | null
          id?: string
          lighthouse_cid?: string | null
          metadata_cid?: string | null
          name?: string
          nft_contract_address?: string | null
          nft_status?: Database["public"]["Enums"]["nft_status"]
          nft_token_id?: string | null
          owner_wallet_address?: string
          updated_at?: string
          view_count?: number | null
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount_pyusd: number
          buyer_wallet_address: string
          completed_at: string | null
          created_at: string
          id: string
          listing_id: string | null
          project_id: string
          seller_wallet_address: string
          transaction_hash: string
          transaction_status: Database["public"]["Enums"]["transaction_status"]
        }
        Insert: {
          amount_pyusd: number
          buyer_wallet_address: string
          completed_at?: string | null
          created_at?: string
          id?: string
          listing_id?: string | null
          project_id: string
          seller_wallet_address: string
          transaction_hash: string
          transaction_status?: Database["public"]["Enums"]["transaction_status"]
        }
        Update: {
          amount_pyusd?: number
          buyer_wallet_address?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          listing_id?: string | null
          project_id?: string
          seller_wallet_address?: string
          transaction_hash?: string
          transaction_status?: Database["public"]["Enums"]["transaction_status"]
        }
        Relationships: [
          {
            foreignKeyName: "transactions_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "nft_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          id: string
          twitter_handle: string | null
          updated_at: string
          username: string | null
          wallet_address: string
          website: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          id?: string
          twitter_handle?: string | null
          updated_at?: string
          username?: string | null
          wallet_address: string
          website?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          id?: string
          twitter_handle?: string | null
          updated_at?: string
          username?: string | null
          wallet_address?: string
          website?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_marketplace_stats: {
        Args: Record<PropertyKey, never>
        Returns: {
          active_listings: number
          avg_sale_price: number
          sold_listings: number
          total_listings: number
          total_volume: number
        }[]
      }
    }
    Enums: {
      listing_status: "active" | "sold" | "delisted"
      nft_status: "draft" | "minted" | "listed" | "sold" | "delisted"
      transaction_status: "pending" | "completed" | "failed"
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
      listing_status: ["active", "sold", "delisted"],
      nft_status: ["draft", "minted", "listed", "sold", "delisted"],
      transaction_status: ["pending", "completed", "failed"],
    },
  },
} as const
