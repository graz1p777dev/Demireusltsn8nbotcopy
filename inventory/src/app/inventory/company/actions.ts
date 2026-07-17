'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { requireOwner } from '@/lib/require-owner'

export type CompanySettings = { name: string; inn: string; director: string; phone: string; address: string; currency: string; timezone: string }
export type CompanyAccount = { id: string; name: string; account_type: 'cash' | 'bank' | 'electronic'; balance: number; color: string }

const SettingsSchema = z.object({
  name: z.string().trim().min(1, 'Укажите наименование компании'),
  inn: z.string().trim(), director: z.string().trim(), phone: z.string().trim(), address: z.string().trim(),
  currency: z.enum(['KGS', 'RUB', 'USD']), timezone: z.string().min(1),
})

export async function getCompanySettings(): Promise<CompanySettings> {
  const supabase = await createClient()
  const { data } = await supabase.from('inventory_company_settings').select('name, inn, director, phone, address, currency, timezone').eq('id', true).maybeSingle()
  return data ? { ...data, inn: data.inn ?? '', director: data.director ?? '', phone: data.phone ?? '', address: data.address ?? '' } : { name: '', inn: '', director: '', phone: '', address: '', currency: 'KGS', timezone: 'Asia/Bishkek' }
}

export async function saveCompanySettings(input: unknown): Promise<{ success: true } | { success: false; error: string }> {
  const guard = await requireOwner(); if (!guard.ok) return { success: false, error: guard.error }
  const parsed = SettingsSchema.safeParse(input); if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? 'Проверьте поля' }
  const supabase = await createClient()
  const { error } = await supabase.from('inventory_company_settings').upsert({ id: true, ...parsed.data })
  if (error) return { success: false, error: error.message }
  revalidatePath('/inventory/company/settings'); return { success: true }
}

export async function getCompanyAccounts(): Promise<CompanyAccount[]> {
  const supabase = await createClient()
  const { data } = await supabase.from('inventory_accounts').select('id, name, account_type, balance, color').eq('is_active', true).order('created_at')
  return (data ?? []).map((row) => ({ ...row, account_type: row.account_type as CompanyAccount['account_type'], balance: Number(row.balance) }))
}

const AccountSchema = z.object({ name: z.string().trim().min(1, 'Укажите название счёта'), account_type: z.enum(['cash', 'bank', 'electronic']), balance: z.coerce.number(), color: z.string().regex(/^#[0-9a-fA-F]{6}$/) })
export async function createCompanyAccount(input: unknown): Promise<{ success: true; account: CompanyAccount } | { success: false; error: string }> {
  const guard = await requireOwner(); if (!guard.ok) return { success: false, error: guard.error }
  const parsed = AccountSchema.safeParse(input); if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? 'Проверьте поля' }
  const supabase = await createClient(); const { data, error } = await supabase.from('inventory_accounts').insert(parsed.data).select('id, name, account_type, balance, color').single()
  if (error || !data) return { success: false, error: error?.message ?? 'Не удалось создать счёт' }
  revalidatePath('/inventory/company/accounts'); return { success: true, account: { ...data, account_type: data.account_type as CompanyAccount['account_type'], balance: Number(data.balance) } }
}
