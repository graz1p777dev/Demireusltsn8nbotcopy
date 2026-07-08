'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { requireOwner } from '@/lib/require-owner'

export type ActionResult = { success: true } | { success: false; error: string }

// ─── Общие справочники ──────────────────────────────────────────────────────

export interface WarehouseOption {
  id: string
  name: string
}

export interface EmployeeOption {
  id: string
  name: string
}

async function getWarehouseOptions(): Promise<WarehouseOption[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('inventory_warehouses')
    .select('id, name')
    .eq('is_active', true)
    .order('name')
  return data ?? []
}

async function getEmployeeOptions(): Promise<EmployeeOption[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('employees')
    .select('id, name')
    .is('deleted_at', null)
    .order('name')
  return data ?? []
}

const WarehouseSchema = z.object({
  name: z.string().min(1, 'Название обязательно'),
  address: z.string().nullable(),
})

export async function createWarehouse(
  input: unknown
): Promise<{ success: true; warehouse: WarehouseOption } | { success: false; error: string }> {
  const guard = await requireOwner()
  if (!guard.ok) return { success: false, error: guard.error }

  const parsed = WarehouseSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Ошибка валидации' }
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('inventory_warehouses')
    .insert({ name: parsed.data.name, address: parsed.data.address, is_active: true })
    .select('id, name')
    .single()

  if (error || !data) {
    return { success: false, error: error?.message ?? 'Не удалось создать магазин' }
  }

  revalidatePath('/inventory/cash-shifts')
  return { success: true, warehouse: data }
}

// ─── Кассы (registers) ──────────────────────────────────────────────────────

export interface RegisterCashier {
  id: string
  name: string
}

export interface RegisterRow {
  id: string
  name: string
  warehouse_id: string
  warehouse_name: string | null
  balance: number
  terminals: string[]
  cashiers: RegisterCashier[]
  has_open_shift: boolean
  created_at: string
}

export interface RegistersPageData {
  warehouses: WarehouseOption[]
  employees: EmployeeOption[]
  registers: RegisterRow[]
}

export async function getRegistersPageData(): Promise<RegistersPageData> {
  const supabase = await createClient()

  const [warehouses, employees, { data: registers }, { data: cashierLinks }, { data: openShifts }] =
    await Promise.all([
      getWarehouseOptions(),
      getEmployeeOptions(),
      supabase
        .from('inventory_registers')
        .select('id, name, warehouse_id, balance, terminals, created_at, inventory_warehouses(name)')
        .order('created_at', { ascending: false }),
      supabase.from('inventory_register_cashiers').select('register_id, employees(id, name)'),
      supabase.from('inventory_shifts').select('register_id').eq('status', 'open'),
    ])

  const cashiersByRegister = new Map<string, RegisterCashier[]>()
  for (const link of cashierLinks ?? []) {
    if (!link.employees) continue
    const list = cashiersByRegister.get(link.register_id) ?? []
    list.push({ id: link.employees.id, name: link.employees.name })
    cashiersByRegister.set(link.register_id, list)
  }

  const registersWithOpenShift = new Set((openShifts ?? []).map((s) => s.register_id))

  const registerRows: RegisterRow[] = (registers ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    warehouse_id: r.warehouse_id,
    warehouse_name: r.inventory_warehouses?.name ?? null,
    balance: Number(r.balance),
    terminals: r.terminals ?? [],
    cashiers: cashiersByRegister.get(r.id) ?? [],
    has_open_shift: registersWithOpenShift.has(r.id),
    created_at: r.created_at,
  }))

  return { warehouses, employees, registers: registerRows }
}

const RegisterSchema = z.object({
  name: z.string().min(1, 'Название обязательно'),
  warehouse_id: z.string().uuid('Выберите магазин'),
  cashier_ids: z.array(z.string().uuid()),
  terminals: z.array(z.string().min(1)),
})

function readRegisterFormFields(formData: FormData) {
  return {
    name: formData.get('name'),
    warehouse_id: formData.get('warehouse_id'),
    cashier_ids: JSON.parse(String(formData.get('cashier_ids') ?? '[]')),
    terminals: JSON.parse(String(formData.get('terminals') ?? '[]')),
  }
}

async function syncRegisterCashiers(
  supabase: Awaited<ReturnType<typeof createClient>>,
  registerId: string,
  cashierIds: string[]
): Promise<ActionResult> {
  const { error: deleteError } = await supabase
    .from('inventory_register_cashiers')
    .delete()
    .eq('register_id', registerId)
  if (deleteError) return { success: false, error: deleteError.message }

  if (cashierIds.length === 0) return { success: true }

  const { error: insertError } = await supabase
    .from('inventory_register_cashiers')
    .insert(cashierIds.map((employee_id) => ({ register_id: registerId, employee_id })))
  if (insertError) return { success: false, error: insertError.message }

  return { success: true }
}

export async function createRegister(formData: FormData): Promise<ActionResult & { id?: string }> {
  const guard = await requireOwner()
  if (!guard.ok) return { success: false, error: guard.error }

  let parsed: ReturnType<typeof RegisterSchema.safeParse>
  try {
    parsed = RegisterSchema.safeParse(readRegisterFormFields(formData))
  } catch {
    return { success: false, error: 'Некорректные данные формы' }
  }
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Ошибка валидации' }
  }

  const supabase = await createClient()
  const { data: register, error: insertError } = await supabase
    .from('inventory_registers')
    .insert({
      name: parsed.data.name,
      warehouse_id: parsed.data.warehouse_id,
      terminals: parsed.data.terminals,
    })
    .select('id')
    .single()

  if (insertError || !register) {
    return { success: false, error: insertError?.message ?? 'Не удалось создать кассу' }
  }

  const syncResult = await syncRegisterCashiers(supabase, register.id, parsed.data.cashier_ids)
  if (!syncResult.success) return syncResult

  revalidatePath('/inventory/cash-shifts')
  return { success: true, id: register.id }
}

export async function updateRegister(id: string, formData: FormData): Promise<ActionResult> {
  const guard = await requireOwner()
  if (!guard.ok) return { success: false, error: guard.error }

  let parsed: ReturnType<typeof RegisterSchema.safeParse>
  try {
    parsed = RegisterSchema.safeParse(readRegisterFormFields(formData))
  } catch {
    return { success: false, error: 'Некорректные данные формы' }
  }
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Ошибка валидации' }
  }

  const supabase = await createClient()
  const { error: updateError } = await supabase
    .from('inventory_registers')
    .update({
      name: parsed.data.name,
      warehouse_id: parsed.data.warehouse_id,
      terminals: parsed.data.terminals,
    })
    .eq('id', id)

  if (updateError) return { success: false, error: updateError.message }

  const syncResult = await syncRegisterCashiers(supabase, id, parsed.data.cashier_ids)
  if (!syncResult.success) return syncResult

  revalidatePath('/inventory/cash-shifts')
  return { success: true }
}

// ─── Смены (shifts) ─────────────────────────────────────────────────────────

export interface ShiftRow {
  id: string
  shift_number: number
  register_id: string
  register_name: string | null
  warehouse_name: string | null
  status: string
  opened_at: string
  closed_at: string | null
  cashier_id: string
  cashier_name: string | null
  revenue: number
  sales_count: number
  sales_amount: number
  cash_on_hand: number
}

export interface ShiftsPageData {
  registers: RegisterOption[]
  warehouses: WarehouseOption[]
  employees: EmployeeOption[]
  shifts: ShiftRow[]
}

export interface RegisterOption {
  id: string
  name: string
  warehouse_id: string
}

export async function getShiftsPageData(): Promise<ShiftsPageData> {
  const supabase = await createClient()

  const [warehouses, employees, { data: registers }, { data: shifts }] = await Promise.all([
    getWarehouseOptions(),
    getEmployeeOptions(),
    supabase.from('inventory_registers').select('id, name, warehouse_id'),
    supabase
      .from('inventory_shifts')
      .select(
        'id, shift_number, register_id, status, opened_at, closed_at, cashier_id, revenue, sales_count, sales_amount, cash_on_hand, inventory_registers(name, warehouse_id, inventory_warehouses(name)), employees(name)'
      )
      .order('opened_at', { ascending: false }),
  ])

  const shiftRows: ShiftRow[] = (shifts ?? []).map((s) => ({
    id: s.id,
    shift_number: Number(s.shift_number),
    register_id: s.register_id,
    register_name: s.inventory_registers?.name ?? null,
    warehouse_name: s.inventory_registers?.inventory_warehouses?.name ?? null,
    status: s.status,
    opened_at: s.opened_at,
    closed_at: s.closed_at,
    cashier_id: s.cashier_id,
    cashier_name: s.employees?.name ?? null,
    revenue: Number(s.revenue),
    sales_count: s.sales_count,
    sales_amount: Number(s.sales_amount),
    cash_on_hand: Number(s.cash_on_hand),
  }))

  return { registers: registers ?? [], warehouses, employees, shifts: shiftRows }
}

const CreateShiftSchema = z.object({
  register_id: z.string().uuid('Выберите кассу'),
  cashier_id: z.string().uuid('Выберите кассира'),
})

export async function createShift(formData: FormData): Promise<ActionResult & { id?: string }> {
  const guard = await requireOwner()
  if (!guard.ok) return { success: false, error: guard.error }

  const parsed = CreateShiftSchema.safeParse({
    register_id: formData.get('register_id'),
    cashier_id: formData.get('cashier_id'),
  })
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Ошибка валидации' }
  }

  const supabase = await createClient()

  const { data: openShift } = await supabase
    .from('inventory_shifts')
    .select('id')
    .eq('register_id', parsed.data.register_id)
    .eq('status', 'open')
    .maybeSingle()

  if (openShift) {
    return { success: false, error: 'На этой кассе уже есть открытая смена' }
  }

  const { data: created, error } = await supabase
    .from('inventory_shifts')
    .insert({
      register_id: parsed.data.register_id,
      cashier_id: parsed.data.cashier_id,
      status: 'open',
    })
    .select('id')
    .single()

  if (error || !created) {
    return { success: false, error: error?.message ?? 'Не удалось открыть смену' }
  }

  revalidatePath('/inventory/cash-shifts')
  return { success: true, id: created.id }
}

const CloseShiftSchema = z.object({
  cash_on_hand: z.coerce.number().min(0),
})

export async function closeShift(id: string, formData: FormData): Promise<ActionResult> {
  const guard = await requireOwner()
  if (!guard.ok) return { success: false, error: guard.error }

  const parsed = CloseShiftSchema.safeParse({
    cash_on_hand: formData.get('cash_on_hand'),
  })
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Ошибка валидации' }
  }

  const supabase = await createClient()

  const { data: existing } = await supabase
    .from('inventory_shifts')
    .select('status')
    .eq('id', id)
    .single()

  if (!existing || existing.status !== 'open') {
    return { success: false, error: 'Смена уже закрыта' }
  }

  const { error } = await supabase
    .from('inventory_shifts')
    .update({
      status: 'closed',
      closed_at: new Date().toISOString(),
      cash_on_hand: parsed.data.cash_on_hand,
    })
    .eq('id', id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/inventory/cash-shifts')
  return { success: true }
}
