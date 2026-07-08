import { createClient } from '@/lib/supabase/server'

// Тот же паттерн, что в crm-system: проверка роли через get_my_role().
// RLS на самих таблицах enforced независимо от этой проверки — она нужна
// только для понятного сообщения об ошибке в UI, а не как единственная защита.
export async function requireOwner(): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) return { ok: false, error: 'Не авторизован' }

  const { data: role, error } = await supabase.rpc('get_my_role')
  if (error || role !== 'owner') return { ok: false, error: 'Недостаточно прав' }

  return { ok: true }
}
