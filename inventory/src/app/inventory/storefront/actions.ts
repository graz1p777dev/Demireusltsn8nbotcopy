'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireOwner } from '@/lib/require-owner'
import { createClient } from '@/lib/supabase/server'

const StatusSchema = z.enum(['new', 'confirmed', 'completed', 'cancelled'])

export async function updateShopOrderStatus(formData: FormData) {
  const guard = await requireOwner()
  if (!guard.ok) return

  const orderId = z.string().uuid().safeParse(formData.get('order_id'))
  const status = StatusSchema.safeParse(formData.get('status'))
  if (!orderId.success || !status.success) return

  const supabase = await createClient()
  const { error } = await supabase
    .from('shop_orders')
    .update({ status: status.data })
    .eq('id', orderId.data)

  if (!error) revalidatePath('/inventory/storefront')
}
