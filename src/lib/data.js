export const mockCategories = [
    {
        slug: 'auto', name: 'Авто', image: '/img/categories/auto.jpg',
        subcategories: ['Легковые автомобили', 'Мотоциклы и мототехника', 'Грузовики и спецтехника', 'Водный транспорт', 'Шины и диски'],
    },
    {
        slug: 'realty', name: 'Недвижимость', image: '/img/categories/realty.jpg',
        subcategories: ['Квартиры', 'Комнаты', 'Дома и дачи', 'Земельные участки', 'Коммерческая недвижимость'],
    },
    {
        slug: 'rent', name: 'Жильё для путешествий', image: '/img/categories/rent.jpg',
        subcategories: ['Квартиры посуточно', 'Дома и коттеджи', 'Гостиницы', 'Хостелы', 'Глэмпинги'],
    },
    {
        slug: 'home', name: 'Для дома и дачи', image: '/img/categories/home.jpg',
        subcategories: ['Мебель', 'Бытовая техника', 'Посуда и кухня', 'Ремонт и строительство', 'Растения'],
    },
    {
        slug: 'parts', name: 'Запчасти', image: '/img/categories/parts.jpg',
        subcategories: ['Для автомобилей', 'Для мототехники', 'Масла и автохимия', 'Аккумуляторы', 'Инструменты'],
    },
    {
        slug: 'services', name: 'Услуги', image: '/img/categories/services.jpg',
        subcategories: ['Ремонт и отделка', 'Перевозки и грузчики', 'Обучение и курсы', 'Красота', 'Уборка'],
    },
    {
        slug: 'electronics', name: 'Электроника', image: '/img/categories/electronics.jpg',
        subcategories: ['Телефоны', 'Ноутбуки', 'Аудио и видео', 'Игры и приставки', 'Фототехника'],
    },
    {
        slug: 'jobs', name: 'Работа и подработка', image: '/img/categories/jobs.jpg',
        subcategories: ['Вакансии', 'Резюме', 'Подработка', 'Удалённая работа', 'Стажировки'],
    },
    {
        slug: 'biznes', name: 'Бизнес 360', image: '/img/categories/biznes.jpg',
        subcategories: ['Готовый бизнес', 'Оборудование', 'Франшизы', 'Помещения', 'Инвестиции'],
    },
    {
        slug: 'clothes', name: 'Одежда, обувь, аксессуары', image: '/img/categories/clothes.jpg',
        subcategories: ['Женская одежда', 'Мужская одежда', 'Обувь', 'Сумки и рюкзаки', 'Украшения'],
    },
    {
        slug: 'pets', name: 'Животные', image: '/img/categories/pets.jpg',
        subcategories: ['Собаки', 'Кошки', 'Птицы', 'Аквариум', 'Товары для питомцев'],
    },
    {
        slug: 'kids', name: 'Детские товары', image: '/img/categories/kids.jpg',
        subcategories: ['Детская одежда', 'Игрушки', 'Коляски', 'Автокресла', 'Питание'],
    },
    {
        slug: 'beauty', name: 'Красота и здоровье', image: '/img/categories/beauty.jpg',
        subcategories: ['Косметика', 'Парфюмерия', 'Уход за собой', 'Приборы и аксессуары', 'Здоровье'],
    },
    {
        slug: 'sport', name: 'Спорт и отдых', image: '/img/categories/sport.jpg',
        subcategories: ['Велосипеды', 'Тренажёры', 'Туризм', 'Зимние виды спорта', 'Самокаты'],
    },
    {
        slug: 'books', name: 'Книги и журналы', image: '/img/categories/books.jpg',
        subcategories: ['Художественная литература', 'Учебники', 'Детские книги', 'Журналы', 'Комиксы'],
    },
    {
        slug: 'hobby', name: 'Хобби и фото', image: '/img/categories/hobby.jpg',
        subcategories: ['Музыкальные инструменты', 'Фототехника', 'Коллекционирование', 'Рукоделие', 'Настольные игры'],
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
