import { createClient } from '@/lib/supabase/server'

// Тот же паттерн, что в crm-system: проверка роли через get_my_role().
// RLS на самих таблицах enforced независимо от этой проверки — она нужна
// только для понятного сообщения об ошибке в UI, а не как единственная защита.
export async function requireOwner(): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Не авторизован' }

  const { data: role, error } = await supabase.rpc('get_my_role')
  if (error || role !== 'owner') return { ok: false, error: 'Недостаточно прав' }

  return { ok: true }
}

export async function requireSeller(): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Не авторизован' }
  const { data: employee } = await supabase
    .from('employees')
    .select('role')
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .maybeSingle()
  if (!employee || !['owner', 'manager', 'cashier'].includes(employee.role)) {
    return { ok: false, error: 'Нет прав на проведение продажи' }
  }
  return { ok: true }
}
