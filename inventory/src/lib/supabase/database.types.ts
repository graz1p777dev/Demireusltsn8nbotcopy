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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      advance_payments: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          date: string
          employee_id: string
          id: string
          notes: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          date: string
          employee_id: string
          id?: string
          notes?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          date?: string
          employee_id?: string
          id?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "advance_payments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advance_payments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance: {
        Row: {
          comment: string | null
          created_at: string
          date: string
          employee_id: string
          id: string
          marked_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          date: string
          employee_id: string
          id?: string
          marked_by?: string | null
          status: string
          updated_at?: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          date?: string
          employee_id?: string
          id?: string
          marked_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_marked_by_fkey"
            columns: ["marked_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          employee_id: string | null
          id: string
          ip_address: unknown
          new_data: Json | null
          old_data: Json | null
          resource_id: string | null
          resource_type: string
          user_agent: string | null
        }
        Insert: {
          action: string
          created_at?: string
          employee_id?: string | null
          id?: string
          ip_address?: unknown
          new_data?: Json | null
          old_data?: Json | null
          resource_id?: string | null
          resource_type: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          employee_id?: string | null
          id?: string
          ip_address?: unknown
          new_data?: Json | null
          old_data?: Json | null
          resource_id?: string | null
          resource_type?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      company_plans: {
        Row: {
          avg_check: number
          conv_appeal_lead: number
          conv_fv_sale: number
          conv_lead_nv: number
          conv_nv_fv: number
          created_at: string
          created_by: string | null
          date_end: string
          date_start: string
          id: string
          target_revenue: number
          updated_at: string
        }
        Insert: {
          avg_check: number
          conv_appeal_lead: number
          conv_fv_sale: number
          conv_lead_nv: number
          conv_nv_fv: number
          created_at?: string
          created_by?: string | null
          date_end: string
          date_start: string
          id?: string
          target_revenue: number
          updated_at?: string
        }
        Update: {
          avg_check?: number
          conv_appeal_lead?: number
          conv_fv_sale?: number
          conv_lead_nv?: number
          conv_nv_fv?: number
          created_at?: string
          created_by?: string | null
          date_end?: string
          date_start?: string
          id?: string
          target_revenue?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_plans_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      consultations: {
        Row: {
          actual_status: string | null
          alb_status: string | null
          amount: number
          client_name: string
          comment: string | null
          consulting_doctor: string | null
          created_at: string
          date: string
          deal_number: string | null
          deleted_at: string | null
          delivery_cost: number
          format: string | null
          id: string
          is_nv: boolean
          manager_id: string | null
          phone: string | null
          recorded_by: string | null
          recorded_by_id: string | null
          status: string | null
          status_after_fv: string | null
          time: string | null
          updated_at: string
        }
        Insert: {
          actual_status?: string | null
          alb_status?: string | null
          amount?: number
          client_name: string
          comment?: string | null
          consulting_doctor?: string | null
          created_at?: string
          date: string
          deal_number?: string | null
          deleted_at?: string | null
          delivery_cost?: number
          format?: string | null
          id?: string
          is_nv?: boolean
          manager_id?: string | null
          phone?: string | null
          recorded_by?: string | null
          recorded_by_id?: string | null
          status?: string | null
          status_after_fv?: string | null
          time?: string | null
          updated_at?: string
        }
        Update: {
          actual_status?: string | null
          alb_status?: string | null
          amount?: number
          client_name?: string
          comment?: string | null
          consulting_doctor?: string | null
          created_at?: string
          date?: string
          deal_number?: string | null
          deleted_at?: string | null
          delivery_cost?: number
          format?: string | null
          id?: string
          is_nv?: boolean
          manager_id?: string | null
          phone?: string | null
          recorded_by?: string | null
          recorded_by_id?: string | null
          status?: string | null
          status_after_fv?: string | null
          time?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "consultations_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultations_recorded_by_id_fkey"
            columns: ["recorded_by_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_activity: {
        Row: {
          appeals_fact: number | null
          created_at: string
          created_by: string | null
          date: string
          employee_id: string
          fv_fact: number | null
          id: string
          leads_fact: number | null
          notes: string | null
          nv_fact: number | null
          nv_revenue_fact: number | null
          nv_sales_fact: number | null
          revenue_fact: number | null
          sales_fact: number | null
          updated_at: string
        }
        Insert: {
          appeals_fact?: number | null
          created_at?: string
          created_by?: string | null
          date: string
          employee_id: string
          fv_fact?: number | null
          id?: string
          leads_fact?: number | null
          notes?: string | null
          nv_fact?: number | null
          nv_revenue_fact?: number | null
          nv_sales_fact?: number | null
          revenue_fact?: number | null
          sales_fact?: number | null
          updated_at?: string
        }
        Update: {
          appeals_fact?: number | null
          created_at?: string
          created_by?: string | null
          date?: string
          employee_id?: string
          fv_fact?: number | null
          id?: string
          leads_fact?: number | null
          notes?: string | null
          nv_fact?: number | null
          nv_revenue_fact?: number | null
          nv_sales_fact?: number | null
          revenue_fact?: number | null
          sales_fact?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_facts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_facts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          manager_id: string | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          manager_id?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          manager_id?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          category: string
          created_at: string
          deleted_at: string | null
          id: string
          is_generated: boolean
          mime_type: string | null
          name: string
          original_name: string
          related_id: string | null
          related_type: string | null
          size_bytes: number | null
          storage_path: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          category?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_generated?: boolean
          mime_type?: string | null
          name: string
          original_name: string
          related_id?: string | null
          related_type?: string | null
          size_bytes?: number | null
          storage_path: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_generated?: boolean
          mime_type?: string | null
          name?: string
          original_name?: string
          related_id?: string | null
          related_type?: string | null
          size_bytes?: number | null
          storage_path?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_kpi: {
        Row: {
          created_at: string
          created_by: string | null
          employee_id: string
          id: string
          kpi_template_id: string | null
          notes: string | null
          period_month: number
          period_year: number
          plan_appeals: number | null
          plan_fv: number | null
          plan_leads: number | null
          plan_nv: number | null
          plan_revenue: number | null
          plan_sales: number | null
          plan_work_days: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          employee_id: string
          id?: string
          kpi_template_id?: string | null
          notes?: string | null
          period_month: number
          period_year: number
          plan_appeals?: number | null
          plan_fv?: number | null
          plan_leads?: number | null
          plan_nv?: number | null
          plan_revenue?: number | null
          plan_sales?: number | null
          plan_work_days?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          employee_id?: string
          id?: string
          kpi_template_id?: string | null
          notes?: string | null
          period_month?: number
          period_year?: number
          plan_appeals?: number | null
          plan_fv?: number | null
          plan_leads?: number | null
          plan_nv?: number | null
          plan_revenue?: number | null
          plan_sales?: number | null
          plan_work_days?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_kpi_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_kpi_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_kpi_kpi_template_id_fkey"
            columns: ["kpi_template_id"]
            isOneToOne: false
            referencedRelation: "kpi_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_kpi_item_results: {
        Row: {
          created_at: string
          employee_id: string
          id: string
          is_completed: boolean
          kpi_item_id: string
          notes: string | null
          period_month: number
          period_year: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          id?: string
          is_completed?: boolean
          kpi_item_id: string
          notes?: string | null
          period_month: number
          period_year: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          id?: string
          is_completed?: boolean
          kpi_item_id?: string
          notes?: string | null
          period_month?: number
          period_year?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_kpi_item_results_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_kpi_item_results_kpi_item_id_fkey"
            columns: ["kpi_item_id"]
            isOneToOne: false
            referencedRelation: "kpi_items"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_kpi_results: {
        Row: {
          closed_at: string | null
          closed_by: string | null
          created_at: string
          daily_bonus: number
          employee_id: string
          id: string
          is_closed: boolean
          items_bonus: number
          notes: string | null
          period_month: number
          period_year: number
          plan_bonus: number
          plan_completion_pct: number
          total_bonus: number
          updated_at: string
        }
        Insert: {
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          daily_bonus?: number
          employee_id: string
          id?: string
          is_closed?: boolean
          items_bonus?: number
          notes?: string | null
          period_month: number
          period_year: number
          plan_bonus?: number
          plan_completion_pct?: number
          total_bonus?: number
          updated_at?: string
        }
        Update: {
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          daily_bonus?: number
          employee_id?: string
          id?: string
          is_closed?: boolean
          items_bonus?: number
          notes?: string | null
          period_month?: number
          period_year?: number
          plan_bonus?: number
          plan_completion_pct?: number
          total_bonus?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_kpi_results_closed_by_fkey"
            columns: ["closed_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_kpi_results_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          avatar_url: string | null
          base_salary: number
          birth_date: string | null
          created_at: string
          deleted_at: string | null
          department_id: string | null
          email: string
          hire_date: string | null
          id: string
          kpi_coefficient: number
          must_change_password: boolean
          name: string
          notes: string | null
          phone: string | null
          role: string
          schedule_anchor_date: string | null
          schedule_type: string
          status: string
          updated_at: string
          user_id: string | null
          work_end_time: string | null
          work_start_time: string | null
        }
        Insert: {
          avatar_url?: string | null
          base_salary?: number
          birth_date?: string | null
          created_at?: string
          deleted_at?: string | null
          department_id?: string | null
          email: string
          hire_date?: string | null
          id?: string
          kpi_coefficient?: number
          must_change_password?: boolean
          name: string
          notes?: string | null
          phone?: string | null
          role?: string
          schedule_anchor_date?: string | null
          schedule_type?: string
          status?: string
          updated_at?: string
          user_id?: string | null
          work_end_time?: string | null
          work_start_time?: string | null
        }
        Update: {
          avatar_url?: string | null
          base_salary?: number
          birth_date?: string | null
          created_at?: string
          deleted_at?: string | null
          department_id?: string | null
          email?: string
          hire_date?: string | null
          id?: string
          kpi_coefficient?: number
          must_change_password?: boolean
          name?: string
          notes?: string | null
          phone?: string | null
          role?: string
          schedule_anchor_date?: string | null
          schedule_type?: string
          status?: string
          updated_at?: string
          user_id?: string | null
          work_end_time?: string | null
          work_start_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_categories: {
        Row: {
          color: string | null
          created_at: string
          icon: string | null
          id: string
          is_active: boolean
          is_system: boolean
          name: string
          type: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          name: string
          type: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          name?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      finance_periods: {
        Row: {
          created_at: string
          id: string
          last_calculated_at: string | null
          margin_pct: number
          net_profit: number
          period_month: number
          period_year: number
          total_expense: number
          total_income: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_calculated_at?: string | null
          margin_pct?: number
          net_profit?: number
          period_month: number
          period_year: number
          total_expense?: number
          total_income?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          last_calculated_at?: string | null
          margin_pct?: number
          net_profit?: number
          period_month?: number
          period_year?: number
          total_expense?: number
          total_income?: number
          updated_at?: string
        }
        Relationships: []
      }
      finance_transactions: {
        Row: {
          amount: number
          category_id: string
          created_at: string
          created_by: string | null
          date: string
          deleted_at: string | null
          description: string | null
          document_id: string | null
          id: string
          source_id: string | null
          source_type: string | null
          type: string
          updated_at: string
        }
        Insert: {
          amount: number
          category_id: string
          created_at?: string
          created_by?: string | null
          date: string
          deleted_at?: string | null
          description?: string | null
          document_id?: string | null
          id?: string
          source_id?: string | null
          source_type?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          amount?: number
          category_id?: string
          created_at?: string
          created_by?: string | null
          date?: string
          deleted_at?: string | null
          description?: string | null
          document_id?: string | null
          id?: string
          source_id?: string | null
          source_type?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "finance_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_transactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_transactions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      integrations: {
        Row: {
          config: Json | null
          created_at: string
          id: string
          is_active: boolean
          last_sync_at: string | null
          last_sync_error: string | null
          last_sync_status: string | null
          name: string
          type: string
          updated_at: string
          webhook_url: string | null
        }
        Insert: {
          config?: Json | null
          created_at?: string
          id?: string
          is_active?: boolean
          last_sync_at?: string | null
          last_sync_error?: string | null
          last_sync_status?: string | null
          name: string
          type: string
          updated_at?: string
          webhook_url?: string | null
        }
        Update: {
          config?: Json | null
          created_at?: string
          id?: string
          is_active?: boolean
          last_sync_at?: string | null
          last_sync_error?: string | null
          last_sync_status?: string | null
          name?: string
          type?: string
          updated_at?: string
          webhook_url?: string | null
        }
        Relationships: []
      }
      inventory_categories: {
        Row: {
          created_at: string
          id: string
          name: string
          parent_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          parent_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          parent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "inventory_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_doc_number_counters: {
        Row: {
          doc_type: string
          last_number: number
        }
        Insert: {
          doc_type: string
          last_number?: number
        }
        Update: {
          doc_type?: string
          last_number?: number
        }
        Relationships: []
      }
      inventory_document_items: {
        Row: {
          document_id: string
          id: string
          price: number
          product_id: string
          quantity: number
        }
        Insert: {
          document_id: string
          id?: string
          price: number
          product_id: string
          quantity: number
        }
        Update: {
          document_id?: string
          id?: string
          price?: number
          product_id?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "inventory_document_items_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "inventory_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_document_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "inventory_products"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_documents: {
        Row: {
          comment: string | null
          created_at: string
          created_by: string | null
          doc_number: string
          doc_type: string
          id: string
          posted_at: string | null
          status: string
          supplier_id: string | null
          target_warehouse_id: string | null
          total_amount: number
          warehouse_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          created_by?: string | null
          doc_number?: string
          doc_type: string
          id?: string
          posted_at?: string | null
          status?: string
          supplier_id?: string | null
          target_warehouse_id?: string | null
          total_amount?: number
          warehouse_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          created_by?: string | null
          doc_number?: string
          doc_type?: string
          id?: string
          posted_at?: string | null
          status?: string
          supplier_id?: string | null
          target_warehouse_id?: string | null
          total_amount?: number
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_documents_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "inventory_suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_documents_target_warehouse_id_fkey"
            columns: ["target_warehouse_id"]
            isOneToOne: false
            referencedRelation: "inventory_warehouses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_documents_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "inventory_warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_products: {
        Row: {
          barcode: string | null
          category_id: string | null
          code: number
          cost_price: number
          created_at: string
          deleted_at: string | null
          discount_percent: number
          id: string
          image_url: string | null
          is_active: boolean
          min_stock_level: number
          name: string
          retail_price: number
          sku: string
          unit: string
          updated_at: string
        }
        Insert: {
          barcode?: string | null
          category_id?: string | null
          code?: never
          cost_price?: number
          created_at?: string
          deleted_at?: string | null
          discount_percent?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          min_stock_level?: number
          name: string
          retail_price?: number
          sku: string
          unit: string
          updated_at?: string
        }
        Update: {
          barcode?: string | null
          category_id?: string | null
          code?: never
          cost_price?: number
          created_at?: string
          deleted_at?: string | null
          discount_percent?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          min_stock_level?: number
          name?: string
          retail_price?: number
          sku?: string
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "inventory_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_register_cashiers: {
        Row: {
          created_at: string
          employee_id: string
          id: string
          register_id: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          id?: string
          register_id: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          id?: string
          register_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_register_cashiers_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_register_cashiers_register_id_fkey"
            columns: ["register_id"]
            isOneToOne: false
            referencedRelation: "inventory_registers"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_registers: {
        Row: {
          balance: number
          created_at: string
          id: string
          name: string
          terminals: string[]
          warehouse_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          id?: string
          name: string
          terminals?: string[]
          warehouse_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          id?: string
          name?: string
          terminals?: string[]
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_registers_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "inventory_warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_shifts: {
        Row: {
          cash_on_hand: number
          cashier_id: string
          closed_at: string | null
          id: string
          opened_at: string
          register_id: string
          revenue: number
          sales_amount: number
          sales_count: number
          shift_number: number
          status: string
        }
        Insert: {
          cash_on_hand?: number
          cashier_id: string
          closed_at?: string | null
          id?: string
          opened_at?: string
          register_id: string
          revenue?: number
          sales_amount?: number
          sales_count?: number
          shift_number?: never
          status?: string
        }
        Update: {
          cash_on_hand?: number
          cashier_id?: string
          closed_at?: string | null
          id?: string
          opened_at?: string
          register_id?: string
          revenue?: number
          sales_amount?: number
          sales_count?: number
          shift_number?: never
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_shifts_cashier_id_fkey"
            columns: ["cashier_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_shifts_register_id_fkey"
            columns: ["register_id"]
            isOneToOne: false
            referencedRelation: "inventory_registers"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_stock_balances: {
        Row: {
          id: string
          product_id: string
          quantity: number
          updated_at: string
          warehouse_id: string
        }
        Insert: {
          id?: string
          product_id: string
          quantity?: number
          updated_at?: string
          warehouse_id: string
        }
        Update: {
          id?: string
          product_id?: string
          quantity?: number
          updated_at?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_stock_balances_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "inventory_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_stock_balances_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "inventory_warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_stock_movements: {
        Row: {
          balance_after: number
          created_at: string
          document_id: string
          id: string
          product_id: string
          quantity_change: number
          warehouse_id: string
        }
        Insert: {
          balance_after: number
          created_at?: string
          document_id: string
          id?: string
          product_id: string
          quantity_change: number
          warehouse_id: string
        }
        Update: {
          balance_after?: number
          created_at?: string
          document_id?: string
          id?: string
          product_id?: string
          quantity_change?: number
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_stock_movements_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "inventory_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "inventory_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_stock_movements_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "inventory_warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_suppliers: {
        Row: {
          balance: number
          contact_person: string | null
          created_at: string
          id: string
          name: string
          phone: string | null
        }
        Insert: {
          balance?: number
          contact_person?: string | null
          created_at?: string
          id?: string
          name: string
          phone?: string | null
        }
        Update: {
          balance?: number
          contact_person?: string | null
          created_at?: string
          id?: string
          name?: string
          phone?: string | null
        }
        Relationships: []
      }
      inventory_warehouses: {
        Row: {
          address: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      investor_payouts: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          date: string
          description: string | null
          id: string
          investor_id: string
          transaction_id: string | null
          type: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          date: string
          description?: string | null
          id?: string
          investor_id: string
          transaction_id?: string | null
          type?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          date?: string
          description?: string | null
          id?: string
          investor_id?: string
          transaction_id?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "investor_payouts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "investor_payouts_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "investors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "investor_payouts_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "finance_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      investors: {
        Row: {
          created_at: string
          email: string | null
          id: string
          investment_amount: number
          investment_date: string | null
          is_active: boolean
          name: string
          notes: string | null
          phone: string | null
          share_pct: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          investment_amount?: number
          investment_date?: string | null
          is_active?: boolean
          name: string
          notes?: string | null
          phone?: string | null
          share_pct?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          investment_amount?: number
          investment_date?: string | null
          is_active?: boolean
          name?: string
          notes?: string | null
          phone?: string | null
          share_pct?: number
          updated_at?: string
        }
        Relationships: []
      }
      kpi_bonus_blocks: {
        Row: {
          block_type: string
          id: string
          name: string
          role_setting_id: string
          sort_order: number
          value_label_from: string
          value_label_to: string
        }
        Insert: {
          block_type?: string
          id?: string
          name: string
          role_setting_id: string
          sort_order?: number
          value_label_from?: string
          value_label_to?: string
        }
        Update: {
          block_type?: string
          id?: string
          name?: string
          role_setting_id?: string
          sort_order?: number
          value_label_from?: string
          value_label_to?: string
        }
        Relationships: [
          {
            foreignKeyName: "kpi_bonus_blocks_role_setting_id_fkey"
            columns: ["role_setting_id"]
            isOneToOne: false
            referencedRelation: "kpi_role_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      kpi_bonus_tiers: {
        Row: {
          block_id: string
          bonus_amount: number
          id: string
          sort_order: number
          tier_from: number
          tier_to: number | null
        }
        Insert: {
          block_id: string
          bonus_amount?: number
          id?: string
          sort_order?: number
          tier_from?: number
          tier_to?: number | null
        }
        Update: {
          block_id?: string
          bonus_amount?: number
          id?: string
          sort_order?: number
          tier_from?: number
          tier_to?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "kpi_bonus_tiers_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "kpi_bonus_blocks"
            referencedColumns: ["id"]
          },
        ]
      }
      kpi_items: {
        Row: {
          bonus_amount: number
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          role_setting_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          bonus_amount: number
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          role_setting_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          bonus_amount?: number
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          role_setting_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kpi_items_role_setting_id_fkey"
            columns: ["role_setting_id"]
            isOneToOne: false
            referencedRelation: "kpi_role_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      kpi_role_settings: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          rate_per_shift: number
          role_name: string
          salary_amount: number
          salary_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          rate_per_shift?: number
          role_name: string
          salary_amount?: number
          salary_type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          rate_per_shift?: number
          role_name?: string
          salary_amount?: number
          salary_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      kpi_templates: {
        Row: {
          created_at: string
          id: string
          is_default: boolean
          metrics: Json
          min_threshold_pct: number
          name: string
          over_plan_coefficient: number
          role: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean
          metrics?: Json
          min_threshold_pct?: number
          name: string
          over_plan_coefficient?: number
          role: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean
          metrics?: Json
          min_threshold_pct?: number
          name?: string
          over_plan_coefficient?: number
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          action_url: string | null
          body: string | null
          created_at: string
          employee_id: string
          expires_at: string | null
          id: string
          is_important: boolean
          is_read: boolean
          source_id: string | null
          source_type: string | null
          title: string
          type: string
        }
        Insert: {
          action_url?: string | null
          body?: string | null
          created_at?: string
          employee_id: string
          expires_at?: string | null
          id?: string
          is_important?: boolean
          is_read?: boolean
          source_id?: string | null
          source_type?: string | null
          title: string
          type: string
        }
        Update: {
          action_url?: string | null
          body?: string | null
          created_at?: string
          employee_id?: string
          expires_at?: string | null
          id?: string
          is_important?: boolean
          is_read?: boolean
          source_id?: string | null
          source_type?: string | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          can_create: boolean
          can_delete: boolean
          can_edit: boolean
          can_view: boolean
          created_at: string
          id: string
          resource: string
          role_id: string
          scope: string
          updated_at: string
        }
        Insert: {
          can_create?: boolean
          can_delete?: boolean
          can_edit?: boolean
          can_view?: boolean
          created_at?: string
          id?: string
          resource: string
          role_id: string
          scope?: string
          updated_at?: string
        }
        Update: {
          can_create?: boolean
          can_delete?: boolean
          can_edit?: boolean
          can_view?: boolean
          created_at?: string
          id?: string
          resource?: string
          role_id?: string
          scope?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          is_system: boolean
          label: string
          name: string
          permission_level: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_system?: boolean
          label: string
          name: string
          permission_level?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_system?: boolean
          label?: string
          name?: string
          permission_level?: string
          updated_at?: string
        }
        Relationships: []
      }
      salaries: {
        Row: {
          advance_amount: number
          base_salary: number
          bonuses: number
          calculated_at: string | null
          created_at: string
          deductions: number
          employee_id: string
          id: string
          kpi_bonus: number
          kpi_pct: number
          notes: string | null
          paid_at: string | null
          paid_by: string | null
          period_month: number
          period_year: number
          status: string
          total_amount: number
          updated_at: string
          work_days_fact: number
          work_days_plan: number
        }
        Insert: {
          advance_amount?: number
          base_salary?: number
          bonuses?: number
          calculated_at?: string | null
          created_at?: string
          deductions?: number
          employee_id: string
          id?: string
          kpi_bonus?: number
          kpi_pct?: number
          notes?: string | null
          paid_at?: string | null
          paid_by?: string | null
          period_month: number
          period_year: number
          status?: string
          total_amount?: number
          updated_at?: string
          work_days_fact?: number
          work_days_plan?: number
        }
        Update: {
          advance_amount?: number
          base_salary?: number
          bonuses?: number
          calculated_at?: string | null
          created_at?: string
          deductions?: number
          employee_id?: string
          id?: string
          kpi_bonus?: number
          kpi_pct?: number
          notes?: string | null
          paid_at?: string | null
          paid_by?: string | null
          period_month?: number
          period_year?: number
          status?: string
          total_amount?: number
          updated_at?: string
          work_days_fact?: number
          work_days_plan?: number
        }
        Relationships: [
          {
            foreignKeyName: "salaries_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salaries_paid_by_fkey"
            columns: ["paid_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      salary_calculations: {
        Row: {
          amount: number
          created_at: string
          description: string
          id: string
          metric_fact: number | null
          metric_name: string | null
          metric_pct: number | null
          metric_plan: number | null
          salary_id: string
          type: string
          weight: number | null
        }
        Insert: {
          amount: number
          created_at?: string
          description: string
          id?: string
          metric_fact?: number | null
          metric_name?: string | null
          metric_pct?: number | null
          metric_plan?: number | null
          salary_id: string
          type: string
          weight?: number | null
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          id?: string
          metric_fact?: number | null
          metric_name?: string | null
          metric_pct?: number | null
          metric_plan?: number | null
          salary_id?: string
          type?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "salary_calculations_salary_id_fkey"
            columns: ["salary_id"]
            isOneToOne: false
            referencedRelation: "salaries"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_plan_weekly: {
        Row: {
          created_at: string
          employee_id: string
          id: string
          kpi_pct: number
          last_calculated_at: string | null
          period_month: number
          period_year: number
          total_fv_fact: number
          total_fv_plan: number
          total_revenue_fact: number
          total_revenue_plan: number
          total_sales_fact: number
          total_sales_plan: number
          total_work_days_fact: number
          total_work_days_plan: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          id?: string
          kpi_pct?: number
          last_calculated_at?: string | null
          period_month: number
          period_year: number
          total_fv_fact?: number
          total_fv_plan?: number
          total_revenue_fact?: number
          total_revenue_plan?: number
          total_sales_fact?: number
          total_sales_plan?: number
          total_work_days_fact?: number
          total_work_days_plan?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          id?: string
          kpi_pct?: number
          last_calculated_at?: string | null
          period_month?: number
          period_year?: number
          total_fv_fact?: number
          total_fv_plan?: number
          total_revenue_fact?: number
          total_revenue_plan?: number
          total_sales_fact?: number
          total_sales_plan?: number
          total_work_days_fact?: number
          total_work_days_plan?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "decomposition_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      schedules: {
        Row: {
          created_at: string
          date: string
          employee_id: string
          id: string
          is_workday: boolean
          note: string | null
          updated_at: string
          work_end: string | null
          work_start: string | null
        }
        Insert: {
          created_at?: string
          date: string
          employee_id: string
          id?: string
          is_workday?: boolean
          note?: string | null
          updated_at?: string
          work_end?: string | null
          work_start?: string | null
        }
        Update: {
          created_at?: string
          date?: string
          employee_id?: string
          id?: string
          is_workday?: boolean
          note?: string | null
          updated_at?: string
          work_end?: string | null
          work_start?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "schedules_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          absence_alert_time: string
          company_name: string
          created_at: string
          currency: string
          default_work_end: string
          default_work_start: string
          extra: Json | null
          id: string
          kpi_alert_threshold: number
          language: string
          logo_url: string | null
          month_start_day: number
          salary_close_day: number
          salary_pay_day: number
          theme: string
          timezone: string
          updated_at: string
          week_start_day: number
        }
        Insert: {
          absence_alert_time?: string
          company_name?: string
          created_at?: string
          currency?: string
          default_work_end?: string
          default_work_start?: string
          extra?: Json | null
          id?: string
          kpi_alert_threshold?: number
          language?: string
          logo_url?: string | null
          month_start_day?: number
          salary_close_day?: number
          salary_pay_day?: number
          theme?: string
          timezone?: string
          updated_at?: string
          week_start_day?: number
        }
        Update: {
          absence_alert_time?: string
          company_name?: string
          created_at?: string
          currency?: string
          default_work_end?: string
          default_work_start?: string
          extra?: Json | null
          id?: string
          kpi_alert_threshold?: number
          language?: string
          logo_url?: string | null
          month_start_day?: number
          salary_close_day?: number
          salary_pay_day?: number
          theme?: string
          timezone?: string
          updated_at?: string
          week_start_day?: number
        }
        Relationships: []
      }
      work_schedules: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_system: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_salary: {
        Args: { p_employee_id: string; p_month: number; p_year: number }
        Returns: string
      }
      close_kpi_month: {
        Args: { p_employee_id: string; p_month: number; p_year: number }
        Returns: undefined
      }
      generate_monthly_schedule: {
        Args: { p_employee_id: string; p_month: number; p_year: number }
        Returns: undefined
      }
      get_my_department_id: { Args: never; Returns: string }
      get_my_employee_id: { Args: never; Returns: string }
      get_my_permission_level: { Args: never; Returns: string }
      get_my_role: { Args: never; Returns: string }
      inventory_apply_stock_change: {
        Args: {
          p_document_id: string
          p_product_id: string
          p_quantity_change: number
          p_warehouse_id: string
        }
        Returns: number
      }
      inventory_doc_type_prefix: {
        Args: { p_doc_type: string }
        Returns: string
      }
      inventory_generate_doc_number: {
        Args: { p_doc_type: string }
        Returns: string
      }
      recalculate_decomposition: {
        Args: { p_employee_id: string; p_month: number; p_year: number }
        Returns: undefined
      }
      recalculate_finances: {
        Args: { p_month: number; p_year: number }
        Returns: undefined
      }
      recalculate_kpi_results: {
        Args: { p_employee_id: string; p_month: number; p_year: number }
        Returns: undefined
      }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
