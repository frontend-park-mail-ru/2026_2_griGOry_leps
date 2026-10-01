export const mockCategories = [
    {
        slug: 'auto', name: 'Авто', image: '/img/mock/car.png',
        subcategories: ['Легковые автомобили', 'Мотоциклы и мототехника', 'Грузовики и спецтехника', 'Водный транспорт', 'Шины и диски'],
    },
    {
        slug: 'realty', name: 'Недвижимость', image: '/img/mock/house.png',
        subcategories: ['Квартиры', 'Комнаты', 'Дома и дачи', 'Земельные участки', 'Коммерческая недвижимость'],
    },
    {
        slug: 'rent', name: 'Жильё для путешествий', image: '/img/mock/suitcases.png',
        subcategories: ['Квартиры посуточно', 'Дома и коттеджи', 'Гостиницы', 'Хостелы', 'Глэмпинги'],
    },
    {
        slug: 'home', name: 'Для дома и дачи', image: '/img/mock/for_garden.png',
        subcategories: ['Мебель', 'Бытовая техника', 'Посуда и кухня', 'Ремонт и строительство', 'Растения'],
    },
    {
        slug: 'parts', name: 'Запчасти', image: '/img/mock/bolts.png',
        subcategories: ['Для автомобилей', 'Для мототехники', 'Масла и автохимия', 'Аккумуляторы', 'Инструменты'],
    },
    {
        slug: 'services', name: 'Услуги', image: '/img/mock/drill.png',
        subcategories: ['Ремонт и отделка', 'Перевозки и грузчики', 'Обучение и курсы', 'Красота', 'Уборка'],
    },
    {
        slug: 'electronics', name: 'Электроника', image: '/img/mock/headphones.png',
        subcategories: ['Телефоны', 'Ноутбуки', 'Аудио и видео', 'Игры и приставки', 'Фототехника'],
    },
    {
        slug: 'jobs', name: 'Работа и подработка', image: '/img/mock/money.png',
        subcategories: ['Вакансии', 'Резюме', 'Подработка', 'Удалённая работа', 'Стажировки'],
    },
    {
        slug: 'biznes', name: 'Бизнес 360', image: '/img/mock/business.png',
        subcategories: ['Готовый бизнес', 'Оборудование', 'Франшизы', 'Помещения', 'Инвестиции'],
    },
    {
        slug: 'clothes', name: 'Одежда, обувь, аксессуары', image: '/img/mock/bag.png',
        subcategories: ['Женская одежда', 'Мужская одежда', 'Обувь', 'Сумки и рюкзаки', 'Украшения'],
    },
    {
        slug: 'pets', name: 'Животные', image: '/img/mock/cat.png',
        subcategories: ['Собаки', 'Кошки', 'Птицы', 'Аквариум', 'Товары для питомцев'],
    },
    {
        slug: 'kids', name: 'Детские товары', image: '/img/mock/pencil.png',
        subcategories: ['Детская одежда', 'Игрушки', 'Коляски', 'Автокресла', 'Питание'],
    },
];

export const mockPromos = [
    { title: 'Идём в школу',      subtitle: 'рюкзаки, канцтовары',        image: '/img/mock/pencil.png',         link: '/promo/school' },
    { title: 'Подарок за визит',  subtitle: 'заберите в течение суток',   image: '/img/mock/gift.png',           link: '/promo/gift' },
    { title: 'Сезон велосипедов', subtitle: 'подборка для города и гор', image: '/img/mock/mountain_bike.png',  link: '/promo/bike' },
];

export const CategoryNames = Object.fromEntries(
    mockCategories.map(({ slug, name }) => [slug, name])
);
