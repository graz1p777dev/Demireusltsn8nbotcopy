'use client'

import styles from './shop.module.css'

export default function ShopError({ reset }: { reset: () => void }) {
  return (
    <main className={styles.errorPage}>
      <div className={styles.errorMark}>DR</div>
      <h1>Каталог временно не загрузился</h1>
      <p>Товароучёт доступен, но витрина не получила данные. Попробуйте ещё раз.</p>
      <button type="button" onClick={reset}>Обновить каталог</button>
    </main>
  )
}
