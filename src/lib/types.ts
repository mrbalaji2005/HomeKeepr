export type Role = 'admin' | 'collaborator' | 'staff'

export interface Household { id: string; name: string; created_at: string }

export interface Profile {
  id: string; household_id: string; full_name: string
  email: string; role: Role; created_at: string
}

export interface TaskTemplate {
  id: string; household_id: string; name: string; icon: string
  scheduled_time: string | null; photo_url: string | null
  is_adhoc: boolean; is_recurring: boolean; is_active: boolean; created_at: string
}

export interface TaskLog {
  id: string; task_template_id: string; household_id: string
  log_date: string; completed: boolean; completed_at: string | null
  completed_by: string | null; photo_url: string | null; created_at: string
}

export interface TaskWithLog extends TaskTemplate { log: TaskLog | null }

export interface SalaryAdvance {
  id: string; household_id: string; amount: number
  note: string | null; advance_date: string; created_at: string
}

export interface SalarySetting { id: string; household_id: string; monthly_amount: number }
export interface SalaryPayment {
  id: string; household_id: string; paid_amount: number
  advances_deducted: number; payment_date: string; notes: string | null; created_at: string
}
