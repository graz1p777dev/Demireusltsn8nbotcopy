import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  LayoutDashboard,
  Package,
  Wallet,
  ArrowLeftRight,
  Trash2,
  Users,
  Building2,
  Banknote,
  BarChart3,
  Store,
  CreditCard,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

function Section({
  icon: Icon,
  title,
  status,
  children,
}: {
  icon: LucideIcon
  title: string
  status: "ready" | "wip"
  children: React.ReactNode
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center gap-2.5 space-y-0">
        <div className="flex size-8 flex-shrink-0 items-center justify-center rounded-[9px] bg-secondary text-primary">
          <Icon className="size-4" />
        </div>
        <CardTitle className="flex-1">{title}</CardTitle>
        {status === "ready" ? (
          <Badge variant="success">Работает</Badge>
        ) : (
          <Badge variant="warning">В разработке</Badge>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-2 text-[13px] leading-relaxed text-foreground/75">
        {children}
      </CardContent>
    </Card>
  )
}

function Steps({ items }: { items: string[] }) {
  return (
    <ol className="flex flex-col gap-1.5 pl-4">
      {items.map((item, i) => (
        <li key={i} className="list-decimal marker:text-muted-foreground marker:text-xs">
          {item}
        </li>
      ))}
    </ol>
  )
}

export default function HelpPage() {
  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <div>
        <h1 className="text-lg font-bold text-foreground">Как пользоваться Demi Inventory</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Складской модуль Demi Results OS: товары, кассы и смены, движение товара, отчёты.
          Ниже — по каждому разделу меню слева: что он делает и как этим пользоваться.
          Раздел с пометкой «В разработке» показывает интерфейс, но пока не сохраняет данные —
          он появится позже.
        </p>
      </div>

      <Section icon={LayoutDashboard} title="Главная" status="ready">
        <p>
          Сводка по магазину: выручка, себестоимость продаж, прибыль и средний чек за период,
          график тренда выручки, разбивка продаж по категориям, последние документы и оценка
          остатков на складе. Цифры считаются по данным из «Товаров» и «Движения товара».
        </p>
      </Section>

      <Section icon={Package} title="Товары и услуги" status="ready">
        <p>Основной справочник товаров.</p>
        <Steps
          items={[
            "«Создать товар» — заполните название, артикул, единицу измерения, цены закупки/продажи, категорию. Артикул должен быть уникальным.",
            "При создании можно сразу указать начальный остаток на складе — товар сразу появится в остатках.",
            "«Создать категорию» (иконка папки) — категории используются для группировки товаров в таблице и в фильтрах.",
            "«Импорт товаров» — загрузка списка товаров файлом CSV или Excel (.xlsx). Скачайте шаблон в диалоге импорта, заполните и загрузите обратно. Если товар с таким артикулом уже есть — он обновится, а не задвоится. Категории, которых ещё нет, создаются автоматически по названию из файла.",
            "Клик по товару в списке открывает карточку редактирования.",
            "Удалённые товары не пропадают — они уходят в «Корзину», откуда их можно восстановить.",
          ]}
        />
      </Section>

      <Section icon={Wallet} title="Кассы и смены" status="ready">
        <p>Учёт торговых точек и рабочих смен кассиров.</p>
        <Steps
          items={[
            "Вкладка «Кассы» — «Новая касса»: привязывается к складу, задаётся название и тип.",
            "Вкладка «Смены» — «Открыть смену»: выбирается касса, кассир и начальная сумма в кассе.",
            "Открытую смену можно закрыть — фиксируется итоговая выручка и сумма в кассе на конец смены.",
          ]}
        />
      </Section>

      <Section icon={ArrowLeftRight} title="Движение товара" status="ready">
        <p>Здесь проводятся все операции, которые меняют остатки на складе:</p>
        <ul className="flex flex-col gap-1 pl-4">
          <li className="list-disc marker:text-muted-foreground">
            <b>Приход</b> — закупка у поставщика, увеличивает остаток и себестоимость.
          </li>
          <li className="list-disc marker:text-muted-foreground">
            <b>Расход</b> — продажа, уменьшает остаток.
          </li>
          <li className="list-disc marker:text-muted-foreground">
            <b>Перемещение</b> — между двумя складами.
          </li>
          <li className="list-disc marker:text-muted-foreground">
            <b>Списание</b> — потери, порча, недостача.
          </li>
          <li className="list-disc marker:text-muted-foreground">
            <b>Инвентаризация</b> — вносится фактический остаток, разницу с системным система
            высчитывает сама при проведении документа.
          </li>
        </ul>
        <p className="mt-1">
          Документ создаётся как черновик и не влияет на остатки, пока его не провести
          («Провести» в карточке документа). Для «Прихода» можно на месте создать нового
          поставщика, если его ещё нет в списке.
        </p>
      </Section>

      <Section icon={Trash2} title="Корзина" status="ready">
        <p>
          Удалённые товары хранятся здесь, а не стираются сразу. Можно восстановить товар обратно
          в каталог или удалить окончательно (это действие уже необратимо).
        </p>
      </Section>

      <Section icon={Banknote} title="Движение денег" status="wip">
        <p>
          Учёт прихода и расхода денег по кассам (аренда, зарплата, прочие расходы, поступления не
          от продаж). Интерфейс уже готов, сохранение в базу данных ещё подключается.
        </p>
      </Section>

      <Section icon={BarChart3} title="Отчёты" status="wip">
        <p>
          Отчёты по продажам, товарам, финансам, сотрудникам и клиентам с фильтрами по периоду.
          Сейчас показывает демонстрационные данные, подключение к реальным цифрам — в работе.
        </p>
      </Section>

      <Section icon={Users} title="Контрагенты" status="wip">
        <p>
          Справочники поставщиков и клиентов. Поставщиков уже можно заводить прямо из документа
          «Приход» в разделе «Движение товара» — отдельная страница «Контрагенты» с полным CRUD
          ещё дорабатывается.
        </p>
      </Section>

      <Section icon={Building2} title="Компания" status="wip">
        <p>
          Настройки компании, сотрудники, магазины и счета. Формы готовы, сохранение в базу —
          в разработке.
        </p>
      </Section>

      <Section icon={Store} title="Интернет-витрина" status="wip">
        <p>Публичная страница-каталог для клиентов на основе товаров из каталога. Пока не начата.</p>
      </Section>

      <Section icon={CreditCard} title="Тарифы и оплата" status="wip">
        <p>Управление подпиской на Demi Inventory. Пока не начата.</p>
      </Section>
    </div>
  )
}
