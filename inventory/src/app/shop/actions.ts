'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const OrderSchema = z.object({
  customerName: z.string().trim().min(2, 'Укажите ваше имя').max(120),
  phone: z.string().trim().min(9, 'Укажите номер телефона').max(30),
  address: z.string().trim().max(300).optional().default(''),
  comment: z.string().trim().max(500).optional().default(''),
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().min(1).max(99),
  })).min(1, 'Корзина пуста').max(50),
})

export type PlaceOrderResult =
  | { success: true; orderNumber: number; totalAmount: number }
  | { success: false; error: string }

export async function placeShopOrder(input: unknown): Promise<PlaceOrderResult> {
  const parsed = OrderSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Проверьте данные заказа' }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('create_shop_order', {
    p_customer_name: parsed.data.customerName,
    p_phone: parsed.data.phone,
    p_address: parsed.data.address,
    p_comment: parsed.data.comment,
    p_items: parsed.data.items.map((item) => ({
      product_id: item.productId,
      quantity: item.quantity,
    })),
  })

  if (error) return { success: false, error: error.message }

  const order = data?.[0]
  if (!order) return { success: false, error: 'Не удалось создать заказ' }

  return {
    success: true,
    orderNumber: Number(order.order_number),
    totalAmount: Number(order.total_amount),
  }
}
