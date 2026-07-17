import type { Metadata } from 'next'
import { Unbounded } from 'next/font/google'
import { getShopProducts } from './data'
import ShopClient from './shop-client'

const unbounded = Unbounded({
  subsets: ['cyrillic', 'latin'],
  weight: ['500', '600', '700'],
  variable: '--font-shop-display',
})

export const metadata: Metadata = {
  title: 'Demi Results — магазин корейской косметики',
  description: 'Оригинальная косметика Demi Results. Актуальные цены и наличие из товароучёта.',
}

export const dynamic = 'force-dynamic'

export default async function ShopPage() {
  const products = await getShopProducts()
  return <ShopClient products={products} displayFontClass={unbounded.variable} />
}
