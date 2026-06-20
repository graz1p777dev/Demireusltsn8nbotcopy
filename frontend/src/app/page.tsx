import {
  BedDouble,
  Camera,
  ChevronRight,
  Coffee,
  HeartHandshake,
  MapPin,
  MessageCircle,
  Mountain,
  Quote,
  ShieldCheck,
  Sparkles,
  Star,
  TentTree,
  Trees,
} from "lucide-react";

const navItems = [
  ["Главная", "#home"],
  ["О нас", "#about"],
  ["Дом", "#guest-house"],
  ["Туры", "#tours"],
  ["Цены", "#prices"],
  ["Галерея", "#gallery"],
  ["FAQ", "#faq"],
  ["Контакты", "#contacts"],
];

const features = [
  { icon: BedDouble, title: "Комфортные номера", text: "Чистые комнаты, мягкий текстиль и спокойный отдых после дороги." },
  { icon: Mountain, title: "Горы и озеро", text: "Маршруты к Сон-Кулю, панорамы, джайлоо и живые пейзажи." },
  { icon: Coffee, title: "Тёплое гостеприимство", text: "Домашняя кухня, чай у печи и внимательная встреча гостей." },
  { icon: TentTree, title: "Конные туры", text: "2- и 3-дневные программы с проводниками и снаряжением." },
];

const tours = [
  {
    title: "2-дневный тур",
    subtitle: "Конный тур к озеру Сон-Куль",
    points: ["Кони и снаряжение", "Местный гид", "Проживание в юртах", "3-разовое питание", "Традиционная кыргызская кухня", "Горы, пастбища и озеро"],
    prices: [
      ["Приватный тур", "180 USD"],
      ["Групповой тур 2-3 человека", "160 USD с человека"],
      ["Групповой тур 4+ человека", "150 USD с человека"],
    ],
    guide: "+25 USD в день",
  },
  {
    title: "3-дневный тур",
    subtitle: "Больше маршрутов, больше природы",
    points: ["Кони и снаряжение", "Местный гид", "Приватная юрта для каждой группы", "3-разовое питание", "Красивые горы и озеро", "Туалет с горячим душем в юрт-лагере"],
    prices: [
      ["Групповой тур 4+ человека", "180 USD с человека"],
      ["Групповой тур 3 человека", "190 USD с человека"],
      ["Групповой тур 2 человека", "200 USD с человека"],
      ["Приватный тур", "250 USD"],
    ],
    guide: "+20 USD в день",
  },
];

const gallery = [
  ["1440x960", "Гостевой дом Nomad Place на фоне гор"],
  ["1200x900", "Конная прогулка вдоль Сон-Куля"],
  ["1200x900", "Юрты, вечерний свет и горный пейзаж"],
  ["1200x800", "Номер гостевого дома с натуральными материалами"],
  ["1200x800", "Гости за традиционным ужином"],
  ["1200x900", "Маршрут по пастбищам и перевалам"],
];

const faqs = [
  ["Когда лучше ехать на Сон-Куль?", "Самый комфортный сезон для маршрутов обычно с конца весны до начала осени, когда дороги и пастбища доступны."],
  ["Можно ли приехать без опыта верховой езды?", "Да. Маршруты подбираются под уровень гостей, а проводники помогают с посадкой, темпом и безопасностью."],
  ["Что входит в стоимость тура?", "В стандартные программы входят кони, снаряжение, гид, питание и проживание по выбранному маршруту."],
  ["Как забронировать?", "Напишите в WhatsApp, укажите даты, количество гостей и формат поездки. Команда подтвердит детали и цену."],
];

function PhotoPlaceholder({ size, description, className = "" }: { size: string; description: string; className?: string }) {
  return (
    <div className={`photo-placeholder ${className}`} aria-label={`${size}: ${description}`}>
      <Camera size={28} />
      <strong>{size}</strong>
      <span>{description}</span>
    </div>
  );
}

export default function Home() {
  return (
    <main>
      <header className="site-header">
        <a className="logo" href="#home" aria-label="Nomad Place Guest House">
          <span className="logo-mark">NP</span>
          <span>
            <strong>Nomad Place</strong>
            <small>Guest House</small>
          </span>
        </a>

        <nav className="desktop-nav" aria-label="Главная навигация">
          {navItems.map(([label, href]) => (
            <a href={href} key={href}>{label}</a>
          ))}
        </nav>

        <a className="header-action" href="https://wa.me/996704100104">
          <MessageCircle size={18} />
          WhatsApp
        </a>
      </header>

      <section className="hero" id="home">
        <div className="hero-bg">
          <PhotoPlaceholder size="1920x980" description="Hero-фото: юрта, горы, озеро Сон-Куль и всадник" />
        </div>
        <div className="hero-content">
          <p className="eyebrow">Kyrgyzstan · Son-Kul · Horse tours</p>
          <h1>Stay close. Live deeper.</h1>
          <p className="hero-copy">Гостевой дом и конные туры к озеру Сон-Куль для тех, кто хочет увидеть настоящий Кыргызстан: природу, традиции и спокойное гостеприимство.</p>
          <div className="hero-actions">
            <a className="btn btn-primary" href="#tours">
              Смотреть туры
              <ChevronRight size={18} />
            </a>
            <a className="btn btn-secondary" href="#guest-house">Гостевой дом</a>
          </div>
        </div>
      </section>

      <section className="feature-strip" aria-label="Преимущества">
        {features.map(({ icon: Icon, title, text }) => (
          <article className="feature-card" key={title}>
            <Icon size={28} />
            <h3>{title}</h3>
            <p>{text}</p>
          </article>
        ))}
      </section>

      <section className="section two-column" id="about">
        <div>
          <p className="section-kicker">О нас</p>
          <h2>Место, где путешествие становится личной историей</h2>
          <p>Nomad Place Guest House встречает путешественников, пары, друзей и индивидуальных гостей, которые ищут аутентичный опыт в Кыргызстане. Мы помогаем спланировать отдых, подобрать тур и провести время без лишней суеты.</p>
          <div className="stats">
            <div><strong>2-3</strong><span>дневные туры</span></div>
            <div><strong>RU / EN</strong><span>связь с гостями</span></div>
            <div><strong>24/7</strong><span>быстрый WhatsApp</span></div>
          </div>
        </div>
        <PhotoPlaceholder size="1080x860" description="Портрет хозяев и гостей у гостевого дома" />
      </section>

      <section className="section split-reverse" id="guest-house">
        <PhotoPlaceholder size="1200x900" description="Интерьер комфортного номера Nomad Place Guest House" />
        <div>
          <p className="section-kicker">Guest House</p>
          <h2>Комфорт перед дорогой и после маршрута</h2>
          <p>Гостевой дом подходит для отдыха перед выездом к Сон-Кулю и восстановления после конного тура. Атмосфера простая, чистая и тёплая: всё, что нужно путешественнику после насыщенного дня.</p>
          <ul className="check-list">
            <li><ShieldCheck size={18} /> Уютные комнаты и спокойная атмосфера</li>
            <li><ShieldCheck size={18} /> Домашняя кухня и чай</li>
            <li><ShieldCheck size={18} /> Помощь с маршрутом, трансфером и деталями поездки</li>
          </ul>
        </div>
      </section>

      <section className="section tours-section" id="tours">
        <div className="section-heading">
          <p className="section-kicker">Туры</p>
          <h2>Конные маршруты к Сон-Кулю</h2>
          <p>Выберите короткое насыщенное путешествие или более глубокий маршрут с ночёвкой в юртах и видами на озеро.</p>
        </div>
        <div className="tour-grid">
          {tours.map((tour) => (
            <article className="tour-card" key={tour.title}>
              <div className="tour-card-top">
                <span><Trees size={18} /> Son-Kul</span>
                <h3>{tour.title}</h3>
                <p>{tour.subtitle}</p>
              </div>
              <ul>
                {tour.points.map((point) => <li key={point}>{point}</li>)}
              </ul>
            </article>
          ))}
          <article className="tour-card individual">
            <div className="tour-card-top">
              <span><Sparkles size={18} /> Private</span>
              <h3>Индивидуальные туры</h3>
              <p>Маршрут, длительность и темп под ваш запрос.</p>
            </div>
            <ul>
              <li>Индивидуальные маршруты</li>
              <li>Гибкая продолжительность</li>
              <li>Для опытных и начинающих</li>
              <li>Полная приватность</li>
              <li>Особые пожелания учитываются</li>
            </ul>
            <div className="custom-price">Цена обсуждается индивидуально</div>
          </article>
        </div>
      </section>

      <section className="section prices-section" id="prices">
        <div className="section-heading compact">
          <p className="section-kicker">Цены</p>
          <h2>Прозрачные условия для групп и приватных поездок</h2>
        </div>
        <div className="price-grid">
          {tours.map((tour) => (
            <article className="price-card" key={tour.title}>
              <h3>{tour.title}</h3>
              {tour.prices.map(([name, price]) => (
                <div className="price-row" key={name}>
                  <span>{name}</span>
                  <strong>{price}</strong>
                </div>
              ))}
              <div className="guide-row">Англоязычный гид: <strong>{tour.guide}</strong></div>
            </article>
          ))}
        </div>
      </section>

      <section className="section gallery-section" id="gallery">
        <div className="section-heading">
          <p className="section-kicker">Галерея</p>
          <h2>Фото-зоны для будущего контента</h2>
          <p>Сейчас на месте изображений стоят заглушки с разрешением и описанием, чтобы позже быстро заменить их настоящими фотографиями.</p>
        </div>
        <div className="gallery-grid">
          {gallery.map(([size, description], index) => (
            <PhotoPlaceholder className={index === 0 ? "wide" : ""} size={size} description={description} key={description} />
          ))}
        </div>
      </section>

      <section className="section reviews-section" id="reviews">
        <div>
          <p className="section-kicker">Отзывы</p>
          <h2>Живые эмоции и тёплая атмосфера</h2>
        </div>
        <div className="review-grid">
          {[1, 2, 3].map((item) => (
            <article className="review-card" key={item}>
              <Quote size={24} />
              <p>Очень атмосферное место, красивый маршрут и внимательные проводники. Отличный вариант, чтобы увидеть настоящий Кыргызстан.</p>
              <div>
                {[1, 2, 3, 4, 5].map((star) => <Star size={15} fill="currentColor" key={star} />)}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="section faq-section" id="faq">
        <div className="section-heading compact">
          <p className="section-kicker">FAQ</p>
          <h2>Частые вопросы</h2>
        </div>
        <div className="faq-list">
          {faqs.map(([question, answer]) => (
            <details key={question}>
              <summary>{question}</summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="contact-section" id="contacts">
        <div>
          <p className="section-kicker">Контакты</p>
          <h2>Забронируйте тур или уточните детали</h2>
          <p>Напишите в WhatsApp, и мы подскажем свободные даты, формат поездки, трансфер и подготовку к маршруту.</p>
        </div>
        <div className="contact-card">
          <a className="btn btn-primary full" href="https://wa.me/996704100104">
            <MessageCircle size={20} />
            Написать в WhatsApp
          </a>
          <div><strong>+996 704 100 104</strong><span>Основной номер</span></div>
          <div><strong>+996 507 887 269</strong><span>Дополнительный номер</span></div>
          <div><MapPin size={19} /><span>Kyzart Village, Naryn Region, Kyrgyzstan</span></div>
        </div>
      </section>

      <footer>
        <a className="logo" href="#home">
          <span className="logo-mark">NP</span>
          <span>
            <strong>Nomad Place</strong>
            <small>Guest House</small>
          </span>
        </a>
        <div className="footer-links">
          <span>@Nomad_place_</span>
          <span>Kyzart Village</span>
          <span>WhatsApp: +996 704 100 104</span>
        </div>
        <HeartHandshake size={24} />
      </footer>
    </main>
  );
}
