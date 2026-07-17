'use client'

import { useEffect, useMemo, useState, useTransition, type FormEvent } from 'react'
import {
  ArrowRight,
  Check,
  ChevronDown,
  Minus,
  PackageCheck,
  Plus,
  Search,
  ShoppingBag,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react'
import { placeShopOrder } from './actions'
import type { ShopProduct } from './data'
import styles from './shop.module.css'

type FilterKey = 'all' | 'sun' | 'cleanse' | 'serum' | 'cream' | 'mask'

const FILTERS: { key: FilterKey; label: string; pattern?: RegExp }[] = [
  { key: 'all', label: 'Всё' },
  { key: 'sun', label: 'SPF', pattern: /spf|sun|солнц/i },
  { key: 'cleanse', label: 'Очищение', pattern: /cleanser|cleansing|wash|foam|oil|water|powder/i },
  { key: 'serum', label: 'Сыворотки', pattern: /serum|ampoule|essence|booster/i },
  { key: 'cream', label: 'Кремы', pattern: /cream|lotion|gel|balm/i },
  { key: 'mask', label: 'Маски', pattern: /mask|pad|patch/i },
]

const PACK_COLORS = ['#d9d4ff', '#cfe9ee', '#f6d9e4', '#dde6c5', '#e8ddcf', '#d6e0f1']
const CART_STORAGE_KEY = 'demi-results-shop-cart'

function formatPrice(value: number) {
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(value) + ' сом'
}

function salePrice(product: ShopProduct) {
  const discount = Math.min(100, Math.max(0, product.discountPercent))
  return Math.round(product.retailPrice * (1 - discount / 100))
}

function productLabel(name: string) {
  const words = name.match(/[\p{L}\p{N}]+/gu) ?? []
  return (words[0]?.[0] ?? 'D').toUpperCase()
}

function ProductVisual({ product, index }: { product: ShopProduct; index: number }) {
  if (product.imageUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className={styles.productImage} src={product.imageUrl} alt={product.name} />
  }

  return (
    <div className={styles.productFallback} style={{ backgroundColor: PACK_COLORS[index % PACK_COLORS.length] }}>
      <span className={styles.fallbackBrand}>DEMI</span>
      <span className={styles.fallbackLetter}>{productLabel(product.name)}</span>
      <span className={styles.fallbackSku}>{product.sku}</span>
    </div>
  )
}

interface Props {
  products: ShopProduct[]
  displayFontClass: string
}

export default function ShopClient({ products, displayFontClass }: Props) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<FilterKey>('all')
  const [onlyInStock, setOnlyInStock] = useState(true)
  const [visibleCount, setVisibleCount] = useState(24)
  const [cart, setCart] = useState<Record<string, number>>({})
  const [cartOpen, setCartOpen] = useState(false)
  const [checkout, setCheckout] = useState({ name: '', phone: '', address: '', comment: '' })
  const [orderError, setOrderError] = useState('')
  const [orderNumber, setOrderNumber] = useState<number | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(CART_STORAGE_KEY)
      if (saved) setCart(JSON.parse(saved) as Record<string, number>)
    } catch {
      window.localStorage.removeItem(CART_STORAGE_KEY)
    }
  }, [])

  useEffect(() => {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart))
  }, [cart])

  useEffect(() => setVisibleCount(24), [query, filter, onlyInStock])

  useEffect(() => {
    document.body.style.overflow = cartOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [cartOpen])

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('ru')
    const activeFilter = FILTERS.find((item) => item.key === filter)

    return products.filter((product) => {
      if (onlyInStock && product.stock <= 0) return false
      if (normalizedQuery && !`${product.name} ${product.sku}`.toLocaleLowerCase('ru').includes(normalizedQuery)) return false
      if (activeFilter?.pattern && !activeFilter.pattern.test(product.name)) return false
      return true
    })
  }, [filter, onlyInStock, products, query])

  const cartProducts = useMemo(
    () => products.filter((product) => (cart[product.id] ?? 0) > 0),
    [cart, products]
  )
  const cartCount = cartProducts.reduce((sum, product) => sum + (cart[product.id] ?? 0), 0)
  const cartTotal = cartProducts.reduce(
    (sum, product) => sum + salePrice(product) * (cart[product.id] ?? 0),
    0
  )
  const inStockCount = products.filter((product) => product.stock > 0).length

  const setQuantity = (product: ShopProduct, quantity: number) => {
    const safeQuantity = Math.min(Math.floor(product.stock), Math.max(0, quantity))
    setCart((current) => {
      const next = { ...current }
      if (safeQuantity === 0) delete next[product.id]
      else next[product.id] = safeQuantity
      return next
    })
  }

  const addToCart = (product: ShopProduct) => {
    setQuantity(product, (cart[product.id] ?? 0) + 1)
    setCartOpen(true)
  }

  const submitOrder = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setOrderError('')
    startTransition(async () => {
      const result = await placeShopOrder({
        customerName: checkout.name,
        phone: checkout.phone,
        address: checkout.address,
        comment: checkout.comment,
        items: cartProducts.map((product) => ({
          productId: product.id,
          quantity: cart[product.id] ?? 0,
        })),
      })

      if (!result.success) {
        setOrderError(result.error)
        return
      }

      setOrderNumber(result.orderNumber)
      setCart({})
    })
  }

  return (
    <main className={`${styles.shop} ${displayFontClass}`}>
      <header className={styles.header}>
        <a className={styles.logo} href="/shop" aria-label="Demi Results — главная магазина">
          <span className={styles.logoMark}>DR</span>
          <span>DEMI RESULTS<small>beauty shop</small></span>
        </a>

        <label className={styles.headerSearch}>
          <Search size={18} aria-hidden />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Найти средство или бренд"
            aria-label="Поиск по каталогу"
          />
          {query && <button type="button" onClick={() => setQuery('')} aria-label="Очистить поиск"><X size={16} /></button>}
        </label>

        <button className={styles.cartButton} type="button" onClick={() => setCartOpen(true)}>
          <ShoppingBag size={19} />
          <span>Корзина</span>
          {cartCount > 0 && <b>{cartCount}</b>}
        </button>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}><Sparkles size={15} /> Корейский уход в Бишкеке</span>
          <h1>Уход, который<br /><em>понимает</em> вашу кожу.</h1>
          <p>Подбирайте средства спокойно: цены и наличие обновляются напрямую из товароучёта Demi Results.</p>
          <a href="#catalog" className={styles.heroButton}>Смотреть каталог <ArrowRight size={18} /></a>
        </div>

        <div className={styles.heroShelf} aria-label="Актуальное наличие">
          <div className={styles.shelfHeadline}>
            <span>На полке сегодня</span>
            <strong>{inStockCount}</strong>
            <small>позиций в наличии</small>
          </div>
          <div className={styles.shelfProducts}>
            {products.filter((product) => product.stock > 0).slice(0, 3).map((product, index) => (
              <div className={styles.shelfProduct} key={product.id}>
                <ProductVisual product={product} index={index} />
                <span>{product.name}</span>
              </div>
            ))}
          </div>
          <div className={styles.shelfBase}><span>live stock</span><i /></div>
        </div>
      </section>

      <section className={styles.benefits} aria-label="Преимущества">
        <span><Check size={17} /> Актуальные остатки</span>
        <span><PackageCheck size={17} /> Оригинальная косметика</span>
        <span><Sparkles size={17} /> Поможем подобрать уход</span>
      </section>

      <section className={styles.catalog} id="catalog">
        <div className={styles.catalogHeading}>
          <div>
            <span className={styles.sectionNote}>Каталог / {filtered.length} товаров</span>
            <h2>Что ищем сегодня?</h2>
          </div>
          <label className={styles.stockToggle}>
            <input type="checkbox" checked={onlyInStock} onChange={(event) => setOnlyInStock(event.target.checked)} />
            <span aria-hidden /> Только в наличии
          </label>
        </div>

        <label className={styles.mobileSearch}>
          <Search size={18} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Найти средство или бренд" />
        </label>

        <div className={styles.filters} aria-label="Категории товаров">
          {FILTERS.map((item) => (
            <button
              type="button"
              key={item.key}
              className={filter === item.key ? styles.activeFilter : ''}
              onClick={() => setFilter(item.key)}
            >
              {item.label}
            </button>
          ))}
        </div>

        {filtered.length > 0 ? (
          <>
            <div className={styles.productGrid}>
              {filtered.slice(0, visibleCount).map((product, index) => {
                const price = salePrice(product)
                const quantity = cart[product.id] ?? 0
                return (
                  <article className={styles.productCard} key={product.id}>
                    <div className={styles.visualWrap}>
                      <ProductVisual product={product} index={index} />
                      {product.discountPercent > 0 && <span className={styles.discount}>−{product.discountPercent}%</span>}
                      {product.stock <= 0 && <span className={styles.soldOut}>Нет в наличии</span>}
                    </div>
                    <div className={styles.productInfo}>
                      <span className={styles.productMeta}>{product.country || 'K-beauty'} · {product.unit}</span>
                      <h3>{product.name}</h3>
                      <div className={styles.priceRow}>
                        <strong>{formatPrice(price)}</strong>
                        {price < product.retailPrice && <del>{formatPrice(product.retailPrice)}</del>}
                      </div>
                      {quantity > 0 ? (
                        <div className={styles.quantityControl}>
                          <button type="button" onClick={() => setQuantity(product, quantity - 1)} aria-label="Уменьшить количество"><Minus size={16} /></button>
                          <span>{quantity} в корзине</span>
                          <button type="button" onClick={() => setQuantity(product, quantity + 1)} disabled={quantity >= product.stock} aria-label="Увеличить количество"><Plus size={16} /></button>
                        </div>
                      ) : (
                        <button className={styles.addButton} type="button" disabled={product.stock <= 0} onClick={() => addToCart(product)}>
                          {product.stock > 0 ? <>В корзину <Plus size={17} /></> : 'Нет в наличии'}
                        </button>
                      )}
                    </div>
                  </article>
                )
              })}
            </div>
            {visibleCount < filtered.length && (
              <button className={styles.moreButton} type="button" onClick={() => setVisibleCount((count) => count + 24)}>
                Показать ещё <ChevronDown size={18} />
              </button>
            )}
          </>
        ) : (
          <div className={styles.emptyState}>
            <Search size={28} />
            <h3>Ничего не нашли</h3>
            <p>Попробуйте другое название или откройте все товары.</p>
            <button type="button" onClick={() => { setQuery(''); setFilter('all'); setOnlyInStock(false) }}>Показать весь каталог</button>
          </div>
        )}
      </section>

      <footer className={styles.footer}>
        <div className={styles.logoMark}>DR</div>
        <div><strong>Demi Results</strong><span>Красота начинается с понятного ухода.</span></div>
        <a href="#catalog">Вернуться к каталогу ↑</a>
      </footer>

      {cartOpen && (
        <div className={styles.cartLayer} role="dialog" aria-modal="true" aria-label="Корзина">
          <button className={styles.cartBackdrop} type="button" onClick={() => setCartOpen(false)} aria-label="Закрыть корзину" />
          <aside className={styles.cartPanel}>
            <div className={styles.cartHeader}>
              <div><span>Ваш заказ</span><strong>{cartCount > 0 ? `${cartCount} шт.` : 'Корзина пуста'}</strong></div>
              <button type="button" onClick={() => setCartOpen(false)} aria-label="Закрыть"><X size={22} /></button>
            </div>

            {orderNumber ? (
              <div className={styles.orderSuccess}>
                <span><Check size={30} /></span>
                <h2>Заказ №{orderNumber} принят</h2>
                <p>Мы проверим наличие и свяжемся с вами по указанному номеру телефона.</p>
                <button type="button" onClick={() => { setOrderNumber(null); setCartOpen(false) }}>Вернуться в магазин</button>
              </div>
            ) : cartProducts.length === 0 ? (
              <div className={styles.emptyCart}>
                <ShoppingBag size={34} />
                <h2>Здесь пока пусто</h2>
                <p>Добавьте средства из каталога — они останутся здесь, даже если вы закроете страницу.</p>
                <button type="button" onClick={() => setCartOpen(false)}>Выбрать товары</button>
              </div>
            ) : (
              <>
                <div className={styles.cartItems}>
                  {cartProducts.map((product, index) => {
                    const quantity = cart[product.id] ?? 0
                    return (
                      <div className={styles.cartItem} key={product.id}>
                        <div className={styles.cartThumb}><ProductVisual product={product} index={index} /></div>
                        <div className={styles.cartItemInfo}>
                          <h3>{product.name}</h3>
                          <strong>{formatPrice(salePrice(product) * quantity)}</strong>
                          <div className={styles.cartQuantity}>
                            <button type="button" onClick={() => setQuantity(product, quantity - 1)}><Minus size={14} /></button>
                            <span>{quantity}</span>
                            <button type="button" onClick={() => setQuantity(product, quantity + 1)} disabled={quantity >= product.stock}><Plus size={14} /></button>
                          </div>
                        </div>
                        <button className={styles.removeItem} type="button" onClick={() => setQuantity(product, 0)} aria-label={`Удалить ${product.name}`}><Trash2 size={17} /></button>
                      </div>
                    )
                  })}
                </div>

                <form className={styles.checkout} onSubmit={submitOrder}>
                  <div className={styles.totalRow}><span>Итого</span><strong>{formatPrice(cartTotal)}</strong></div>
                  <p>Оплата после подтверждения заказа менеджером.</p>
                  <div className={styles.formGrid}>
                    <label><span>Ваше имя *</span><input required minLength={2} value={checkout.name} onChange={(event) => setCheckout({ ...checkout, name: event.target.value })} placeholder="Как к вам обращаться" /></label>
                    <label><span>Телефон *</span><input required inputMode="tel" value={checkout.phone} onChange={(event) => setCheckout({ ...checkout, phone: event.target.value })} placeholder="+996 555 000 000" /></label>
                    <label><span>Адрес или способ получения</span><input value={checkout.address} onChange={(event) => setCheckout({ ...checkout, address: event.target.value })} placeholder="Самовывоз или адрес доставки" /></label>
                    <label><span>Комментарий</span><textarea rows={2} value={checkout.comment} onChange={(event) => setCheckout({ ...checkout, comment: event.target.value })} placeholder="Пожелания к заказу" /></label>
                  </div>
                  {orderError && <div className={styles.orderError}>{orderError}</div>}
                  <button className={styles.checkoutButton} type="submit" disabled={isPending}>
                    {isPending ? 'Оформляем…' : <>Оформить заказ <ArrowRight size={18} /></>}
                  </button>
                </form>
              </>
            )}
          </aside>
        </div>
      )}
    </main>
  )
}
