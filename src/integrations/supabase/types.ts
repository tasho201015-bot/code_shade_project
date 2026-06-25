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
      back_in_stock_subscriptions: {
        Row: {
          channel: string
          color_id: string | null
          created_at: string
          email: string
          id: string
          notified_at: string | null
          product_id: string
          size_id: string | null
          user_id: string | null
        }
        Insert: {
          channel?: string
          color_id?: string | null
          created_at?: string
          email: string
          id?: string
          notified_at?: string | null
          product_id: string
          size_id?: string | null
          user_id?: string | null
        }
        Update: {
          channel?: string
          color_id?: string | null
          created_at?: string
          email?: string
          id?: string
          notified_at?: string | null
          product_id?: string
          size_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "back_in_stock_subscriptions_color_id_fkey"
            columns: ["color_id"]
            isOneToOne: false
            referencedRelation: "product_colors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "back_in_stock_subscriptions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "back_in_stock_subscriptions_size_id_fkey"
            columns: ["size_id"]
            isOneToOne: false
            referencedRelation: "product_sizes"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          description_ar: string | null
          id: string
          image_url: string | null
          is_active: boolean
          meta_description: string | null
          meta_description_ar: string | null
          meta_title: string | null
          meta_title_ar: string | null
          name: string
          name_ar: string | null
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          description_ar?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          meta_description?: string | null
          meta_description_ar?: string | null
          meta_title?: string | null
          meta_title_ar?: string | null
          name: string
          name_ar?: string | null
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          description_ar?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          meta_description?: string | null
          meta_description_ar?: string | null
          meta_title?: string | null
          meta_title_ar?: string | null
          name?: string
          name_ar?: string | null
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_campaigns: {
        Row: {
          body_html: string
          body_text: string | null
          created_at: string
          created_by: string | null
          id: string
          last_error: string | null
          name: string
          recipients_count: number
          scheduled_at: string | null
          sent_at: string | null
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          body_html: string
          body_text?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          last_error?: string | null
          name: string
          recipients_count?: number
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          body_html?: string
          body_text?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          last_error?: string | null
          name?: string
          recipients_count?: number
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          occurred_at: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          occurred_at?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          occurred_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      notification_log: {
        Row: {
          channel: string
          created_at: string
          error: string | null
          id: string
          payload: Json
          recipient: string
          sent_at: string | null
          status: string
          subject: string | null
          template: string
        }
        Insert: {
          channel?: string
          created_at?: string
          error?: string | null
          id?: string
          payload?: Json
          recipient: string
          sent_at?: string | null
          status?: string
          subject?: string | null
          template: string
        }
        Update: {
          channel?: string
          created_at?: string
          error?: string | null
          id?: string
          payload?: Json
          recipient?: string
          sent_at?: string | null
          status?: string
          subject?: string | null
          template?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          price: number
          product_id: string | null
          product_name: string
          quantity: number
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          price: number
          product_id?: string | null
          product_name: string
          quantity: number
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          price?: number
          product_id?: string | null
          product_name?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          city: string | null
          confirmation_token: string | null
          confirmed_at: string | null
          created_at: string
          governorate: string | null
          id: string
          payment_provider: string | null
          paymob_order_id: string | null
          paymob_transaction_id: string | null
          phone: string
          shipping_address: string
          status: string
          total: number
          updated_at: string
          user_id: string
        }
        Insert: {
          city?: string | null
          confirmation_token?: string | null
          confirmed_at?: string | null
          created_at?: string
          governorate?: string | null
          id?: string
          payment_provider?: string | null
          paymob_order_id?: string | null
          paymob_transaction_id?: string | null
          phone: string
          shipping_address: string
          status?: string
          total: number
          updated_at?: string
          user_id: string
        }
        Update: {
          city?: string | null
          confirmation_token?: string | null
          confirmed_at?: string | null
          created_at?: string
          governorate?: string | null
          id?: string
          payment_provider?: string | null
          paymob_order_id?: string | null
          paymob_transaction_id?: string | null
          phone?: string
          shipping_address?: string
          status?: string
          total?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      product_color_links: {
        Row: {
          color_id: string
          created_at: string
          product_id: string
          sort_order: number
        }
        Insert: {
          color_id: string
          created_at?: string
          product_id: string
          sort_order?: number
        }
        Update: {
          color_id?: string
          created_at?: string
          product_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_color_links_color_id_fkey"
            columns: ["color_id"]
            isOneToOne: false
            referencedRelation: "product_colors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_color_links_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_colors: {
        Row: {
          created_at: string
          hex: string
          id: string
          is_active: boolean
          name: string
          name_ar: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          hex: string
          id?: string
          is_active?: boolean
          name: string
          name_ar?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          hex?: string
          id?: string
          is_active?: boolean
          name?: string
          name_ar?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      product_faqs: {
        Row: {
          answer: string
          answer_ar: string | null
          created_at: string
          id: string
          is_active: boolean
          product_id: string
          question: string
          question_ar: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          answer: string
          answer_ar?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          product_id: string
          question: string
          question_ar?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          answer?: string
          answer_ar?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          product_id?: string
          question?: string
          question_ar?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_faqs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_live_visitors: {
        Row: {
          last_seen: string
          product_id: string
          session_id: string
        }
        Insert: {
          last_seen?: string
          product_id: string
          session_id: string
        }
        Update: {
          last_seen?: string
          product_id?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_live_visitors_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_recently_viewed: {
        Row: {
          id: string
          product_id: string
          user_id: string
          viewed_at: string
        }
        Insert: {
          id?: string
          product_id: string
          user_id: string
          viewed_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          user_id?: string
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_recently_viewed_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_size_links: {
        Row: {
          created_at: string
          product_id: string
          size_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          product_id: string
          size_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          product_id?: string
          size_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_size_links_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_size_links_size_id_fkey"
            columns: ["size_id"]
            isOneToOne: false
            referencedRelation: "product_sizes"
            referencedColumns: ["id"]
          },
        ]
      }
      product_sizes: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          label: string
          label_ar: string | null
          sort_order: number
          updated_at: string
          weight_max_kg: number | null
          weight_min_kg: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          label: string
          label_ar?: string | null
          sort_order?: number
          updated_at?: string
          weight_max_kg?: number | null
          weight_min_kg?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string
          label_ar?: string | null
          sort_order?: number
          updated_at?: string
          weight_max_kg?: number | null
          weight_min_kg?: number | null
        }
        Relationships: []
      }
      product_variant_availability: {
        Row: {
          color_id: string
          created_at: string
          id: string
          product_id: string
          size_id: string
          status: Database["public"]["Enums"]["variant_status"]
          updated_at: string
        }
        Insert: {
          color_id: string
          created_at?: string
          id?: string
          product_id: string
          size_id: string
          status?: Database["public"]["Enums"]["variant_status"]
          updated_at?: string
        }
        Update: {
          color_id?: string
          created_at?: string
          id?: string
          product_id?: string
          size_id?: string
          status?: Database["public"]["Enums"]["variant_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variant_availability_color_id_fkey"
            columns: ["color_id"]
            isOneToOne: false
            referencedRelation: "product_colors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variant_availability_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variant_availability_size_id_fkey"
            columns: ["size_id"]
            isOneToOne: false
            referencedRelation: "product_sizes"
            referencedColumns: ["id"]
          },
        ]
      }
      product_views: {
        Row: {
          id: string
          product_id: string
          session_id: string
          viewed_at: string
        }
        Insert: {
          id?: string
          product_id: string
          session_id: string
          viewed_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          session_id?: string
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_views_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string
          compare_at_price: number | null
          created_at: string
          description: string | null
          description_ar: string | null
          id: string
          image_url: string | null
          is_active: boolean
          meta_description: string | null
          meta_description_ar: string | null
          meta_title: string | null
          meta_title_ar: string | null
          name: string
          name_ar: string | null
          offer_enabled: boolean
          offer_ends_at: string | null
          offer_starts_at: string | null
          price: number
          stock: number
          updated_at: string
          view_counter_period: string
        }
        Insert: {
          category?: string
          compare_at_price?: number | null
          created_at?: string
          description?: string | null
          description_ar?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          meta_description?: string | null
          meta_description_ar?: string | null
          meta_title?: string | null
          meta_title_ar?: string | null
          name: string
          name_ar?: string | null
          offer_enabled?: boolean
          offer_ends_at?: string | null
          offer_starts_at?: string | null
          price: number
          stock?: number
          updated_at?: string
          view_counter_period?: string
        }
        Update: {
          category?: string
          compare_at_price?: number | null
          created_at?: string
          description?: string | null
          description_ar?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          meta_description?: string | null
          meta_description_ar?: string | null
          meta_title?: string | null
          meta_title_ar?: string | null
          name?: string
          name_ar?: string | null
          offer_enabled?: boolean
          offer_ends_at?: string | null
          offer_starts_at?: string | null
          price?: number
          stock?: number
          updated_at?: string
          view_counter_period?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      sb_bundles: {
        Row: {
          active: boolean
          badge: string
          badge_ar: string | null
          config: Json
          cover_image: string
          created_at: string
          description: string
          description_ar: string | null
          discount_mode: string
          discount_value: number
          ends_at: string | null
          id: string
          locations: string[]
          name: string
          name_ar: string | null
          original_price_override: number | null
          product_ids: string[]
          purchases: number
          sort_order: number
          starts_at: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          badge?: string
          badge_ar?: string | null
          config?: Json
          cover_image?: string
          created_at?: string
          description?: string
          description_ar?: string | null
          discount_mode?: string
          discount_value?: number
          ends_at?: string | null
          id?: string
          locations?: string[]
          name?: string
          name_ar?: string | null
          original_price_override?: number | null
          product_ids?: string[]
          purchases?: number
          sort_order?: number
          starts_at?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          badge?: string
          badge_ar?: string | null
          config?: Json
          cover_image?: string
          created_at?: string
          description?: string
          description_ar?: string | null
          discount_mode?: string
          discount_value?: number
          ends_at?: string | null
          id?: string
          locations?: string[]
          name?: string
          name_ar?: string | null
          original_price_override?: number | null
          product_ids?: string[]
          purchases?: number
          sort_order?: number
          starts_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      sb_cross_sells: {
        Row: {
          active: boolean
          clicks: number
          config: Json
          created_at: string
          id: string
          location: string
          locations: string[]
          max_shown: number
          section_title: string
          section_title_ar: string | null
          style: string
          suggestions: Json
          trigger_product_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          clicks?: number
          config?: Json
          created_at?: string
          id?: string
          location?: string
          locations?: string[]
          max_shown?: number
          section_title?: string
          section_title_ar?: string | null
          style?: string
          suggestions?: Json
          trigger_product_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          clicks?: number
          config?: Json
          created_at?: string
          id?: string
          location?: string
          locations?: string[]
          max_shown?: number
          section_title?: string
          section_title_ar?: string | null
          style?: string
          suggestions?: Json
          trigger_product_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      sb_settings: {
        Row: {
          created_at: string
          data: Json
          id: string
          singleton: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          data?: Json
          id?: string
          singleton?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          singleton?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      sb_upsells: {
        Row: {
          active: boolean
          badge: string
          badge_ar: string | null
          config: Json
          conversions: number
          countdown_ends_at: string | null
          created_at: string
          headline: string
          headline_ar: string | null
          id: string
          note: string
          note_ar: string | null
          original_price: number
          position: string
          positions: string[]
          suggested_bundle_id: string | null
          suggested_product_id: string | null
          trigger_product_id: string
          type: string
          updated_at: string
          upsell_price: number
        }
        Insert: {
          active?: boolean
          badge?: string
          badge_ar?: string | null
          config?: Json
          conversions?: number
          countdown_ends_at?: string | null
          created_at?: string
          headline?: string
          headline_ar?: string | null
          id?: string
          note?: string
          note_ar?: string | null
          original_price?: number
          position?: string
          positions?: string[]
          suggested_bundle_id?: string | null
          suggested_product_id?: string | null
          trigger_product_id: string
          type?: string
          updated_at?: string
          upsell_price?: number
        }
        Update: {
          active?: boolean
          badge?: string
          badge_ar?: string | null
          config?: Json
          conversions?: number
          countdown_ends_at?: string | null
          created_at?: string
          headline?: string
          headline_ar?: string | null
          id?: string
          note?: string
          note_ar?: string | null
          original_price?: number
          position?: string
          positions?: string[]
          suggested_bundle_id?: string | null
          suggested_product_id?: string | null
          trigger_product_id?: string
          type?: string
          updated_at?: string
          upsell_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sb_upsells_suggested_bundle_id_fkey"
            columns: ["suggested_bundle_id"]
            isOneToOne: false
            referencedRelation: "sb_bundles"
            referencedColumns: ["id"]
          },
        ]
      }
      shipping_rates: {
        Row: {
          fee: number
          governorate: string
          updated_at: string
        }
        Insert: {
          fee?: number
          governorate: string
          updated_at?: string
        }
        Update: {
          fee?: number
          governorate?: string
          updated_at?: string
        }
        Relationships: []
      }
      shipping_settings: {
        Row: {
          flat_fee: number
          free_shipping_threshold: number
          id: boolean
          mode: string
          updated_at: string
        }
        Insert: {
          flat_fee?: number
          free_shipping_threshold?: number
          id?: boolean
          mode?: string
          updated_at?: string
        }
        Update: {
          flat_fee?: number
          free_shipping_threshold?: number
          id?: boolean
          mode?: string
          updated_at?: string
        }
        Relationships: []
      }
      team_members: {
        Row: {
          bio: string | null
          bio_ar: string | null
          created_at: string
          cta_label: string | null
          cta_label_ar: string | null
          cta_url: string | null
          email: string | null
          id: string
          image_url: string | null
          is_featured: boolean
          is_visible: boolean
          name: string
          name_ar: string | null
          phone: string | null
          quote: string | null
          quote_ar: string | null
          role: string
          role_ar: string | null
          slug: string
          socials: Json
          sort_order: number
          updated_at: string
        }
        Insert: {
          bio?: string | null
          bio_ar?: string | null
          created_at?: string
          cta_label?: string | null
          cta_label_ar?: string | null
          cta_url?: string | null
          email?: string | null
          id?: string
          image_url?: string | null
          is_featured?: boolean
          is_visible?: boolean
          name: string
          name_ar?: string | null
          phone?: string | null
          quote?: string | null
          quote_ar?: string | null
          role: string
          role_ar?: string | null
          slug: string
          socials?: Json
          sort_order?: number
          updated_at?: string
        }
        Update: {
          bio?: string | null
          bio_ar?: string | null
          created_at?: string
          cta_label?: string | null
          cta_label_ar?: string | null
          cta_url?: string | null
          email?: string | null
          id?: string
          image_url?: string | null
          is_featured?: boolean
          is_visible?: boolean
          name?: string
          name_ar?: string | null
          phone?: string | null
          quote?: string | null
          quote_ar?: string | null
          role?: string
          role_ar?: string | null
          slug?: string
          socials?: Json
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      team_settings: {
        Row: {
          animations_enabled: boolean
          background_color: string | null
          background_image: string | null
          card_radius: number
          card_spacing: number
          columns: number
          created_at: string
          dark_mode: boolean
          eyebrow: string | null
          eyebrow_ar: string | null
          hover_effect: string
          id: string
          layout: string
          overlay_opacity: number
          show_featured_section: boolean
          subtitle: string | null
          subtitle_ar: string | null
          title: string
          title_ar: string | null
          updated_at: string
        }
        Insert: {
          animations_enabled?: boolean
          background_color?: string | null
          background_image?: string | null
          card_radius?: number
          card_spacing?: number
          columns?: number
          created_at?: string
          dark_mode?: boolean
          eyebrow?: string | null
          eyebrow_ar?: string | null
          hover_effect?: string
          id?: string
          layout?: string
          overlay_opacity?: number
          show_featured_section?: boolean
          subtitle?: string | null
          subtitle_ar?: string | null
          title?: string
          title_ar?: string | null
          updated_at?: string
        }
        Update: {
          animations_enabled?: boolean
          background_color?: string | null
          background_image?: string | null
          card_radius?: number
          card_spacing?: number
          columns?: number
          created_at?: string
          dark_mode?: boolean
          eyebrow?: string | null
          eyebrow_ar?: string | null
          hover_effect?: string
          id?: string
          layout?: string
          overlay_opacity?: number
          show_featured_section?: boolean
          subtitle?: string | null
          subtitle_ar?: string | null
          title?: string
          title_ar?: string | null
          updated_at?: string
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
      wishlists: {
        Row: {
          created_at: string
          id: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlists_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      team_members_public: {
        Row: {
          bio: string | null
          created_at: string | null
          cta_label: string | null
          cta_url: string | null
          id: string | null
          image_url: string | null
          is_featured: boolean | null
          is_visible: boolean | null
          name: string | null
          quote: string | null
          role: string | null
          slug: string | null
          socials: Json | null
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          bio?: string | null
          created_at?: string | null
          cta_label?: string | null
          cta_url?: string | null
          id?: string | null
          image_url?: string | null
          is_featured?: boolean | null
          is_visible?: boolean | null
          name?: string | null
          quote?: string | null
          role?: string | null
          slug?: string | null
          socials?: Json | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          bio?: string | null
          created_at?: string | null
          cta_label?: string | null
          cta_url?: string | null
          id?: string | null
          image_url?: string | null
          is_featured?: boolean | null
          is_visible?: boolean | null
          name?: string | null
          quote?: string | null
          role?: string | null
          slug?: string | null
          socials?: Json | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      decrement_product_stock: { Args: { p_items: Json }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      restore_product_stock: { Args: { p_items: Json }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "customer"
      variant_status: "available" | "out_of_stock" | "hidden"
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
      app_role: ["admin", "customer"],
      variant_status: ["available", "out_of_stock", "hidden"],
    },
  },
} as const
