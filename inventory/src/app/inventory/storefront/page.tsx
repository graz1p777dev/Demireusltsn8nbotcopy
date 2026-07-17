import { ExternalLink, PackageCheck, ShoppingBag } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { updateShopOrderStatus } from './actions'

const STATUS_LABELS: Record<string, string> = {
  new: 'Новый',
  confirmed: 'Подтверждён',
  completed: 'Выполнен',
  cancelled: 'Отменён',
}

function money(value: number) {
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(value) + ' сом'
}

export default async function StorefrontPage() {
  const supabase = await createClient()
  const { data: orders } = await supabase
    .from('shop_orders')
    .select('id, order_number, customer_name, phone, address, comment, status, total_amount, created_at, shop_order_items(id, product_name, quantity, unit_price, line_total)')
    .order('created_at', { ascending: false })
    .limit(100)

  const rows = orders ?? []
  const newOrders = rows.filter((order) => order.status === 'new').length

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-6 p-4 md:p-7">
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[.12em] text-violet-600">
            <ShoppingBag size={15} /> Интернет-магазин
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Заказы с витрины</h1>
          <p className="mt-1 text-sm text-slate-500">Новых заказов: {newOrders}. Остатки проверяются при оформлении.</p>
        </div>
        <a
          href="/shop"
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#0c2b42] px-4 text-sm font-bold text-white transition hover:bg-[#123b59]"
        >
          Открыть магазин <ExternalLink size={16} />
        </a>
      </div>

      {rows.length === 0 ? (
        <div className="grid min-h-72 place-items-center rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <div>
            <PackageCheck className="mx-auto mb-4 text-violet-500" size={34} />
            <h2 className="text-lg font-bold text-slate-800">Заказов пока нет</h2>
            <p className="mt-1 text-sm text-slate-500">Когда покупатель оформит заказ на /shop, он появится здесь.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map((order) => (
            <article key={order.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="grid gap-4 border-b border-slate-100 p-5 lg:grid-cols-[130px_1.2fr_1fr_auto] lg:items-center">
                <div>
                  <span className="text-xs font-semibold text-slate-400">Заказ</span>
                  <strong className="block text-lg text-slate-900">№{order.order_number}</strong>
                  <time className="text-xs text-slate-400">{new Date(order.created_at).toLocaleString('ru-RU')}</time>
                </div>
                <div>
                  <strong className="block text-sm text-slate-900">{order.customer_name}</strong>
                  <a href={`tel:${order.phone}`} className="text-sm font-semibold text-violet-600">{order.phone}</a>
                  {order.address && <p className="mt-1 text-xs text-slate-500">{order.address}</p>}
                </div>
                <div>
                  <span className="text-xs text-slate-400">Сумма</span>
                  <strong className="block text-lg text-slate-900">{money(Number(order.total_amount))}</strong>
                  {order.comment && <p className="mt-1 text-xs text-slate-500">Комментарий: {order.comment}</p>}
                </div>
                <form action={updateShopOrderStatus} className="flex items-center gap-2">
                  <input type="hidden" name="order_id" value={order.id} />
                  <select name="status" defaultValue={order.status} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-violet-400">
                    {Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                  <button className="h-10 rounded-xl bg-violet-600 px-4 text-sm font-bold text-white hover:bg-violet-700">Сохранить</button>
                </form>
              </div>
              <div className="divide-y divide-slate-100 bg-slate-50/70 px-5">
                {order.shop_order_items.map((item) => (
                  <div key={item.id} className="grid grid-cols-[1fr_auto_auto] gap-4 py-3 text-sm">
                    <span className="font-semibold text-slate-700">{item.product_name}</span>
                    <span className="text-slate-500">{item.quantity} × {money(Number(item.unit_price))}</span>
                    <strong className="min-w-24 text-right text-slate-800">{money(Number(item.line_total))}</strong>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
