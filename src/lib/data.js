export const mockCategories = [
    {
        slug: 'auto', name: 'Авто', image: '/src/img/mock/car.png',
        subcategories: ['Легковые автомобили', 'Мотоциклы и мототехника', 'Грузовики и спецтехника', 'Водный транспорт', 'Шины и диски'],
    },
    {
        slug: 'realty', name: 'Недвижимость', image: '/src/img/mock/house.png',
        subcategories: ['Квартиры', 'Комнаты', 'Дома и дачи', 'Земельные участки', 'Коммерческая недвижимость'],
    },
    {
        slug: 'rent', name: 'Жильё для путешествий', image: '/src/img/mock/suitcases.png',
        subcategories: ['Квартиры посуточно', 'Дома и коттеджи', 'Гостиницы', 'Хостелы', 'Глэмпинги'],
    },
    {
        slug: 'home', name: 'Для дома и дачи', image: '/src/img/mock/for_garden.png',
        subcategories: ['Мебель', 'Бытовая техника', 'Посуда и кухня', 'Ремонт и строительство', 'Растения'],
    },
    {
        slug: 'parts', name: 'Запчасти', image: '/src/img/mock/bolts.png',
        subcategories: ['Для автомобилей', 'Для мототехники', 'Масла и автохимия', 'Аккумуляторы', 'Инструменты'],
    },
    {
        slug: 'electronics', name: 'Электроника', image: '/src/img/mock/headphones.png',
        subcategories: ['Телефоны', 'Ноутбуки', 'Аудио и видео', 'Игры и приставки', 'Фототехника'],
    },
    {
        slug: 'jobs', name: 'Работа и подработка', image: '/src/img/mock/money.png',
        subcategories: ['Вакансии', 'Резюме', 'Подработка', 'Удалённая работа', 'Стажировки'],
    },
    {
        slug: 'biznes', name: 'Бизнес 360', image: '/src/img/mock/business.png',
        subcategories: ['Готовый бизнес', 'Оборудование', 'Франшизы', 'Помещения', 'Инвестиции'],
    },
    {
        slug: 'clothes', name: 'Одежда, обувь, аксессуары', image: '/src/img/mock/shoe.png',
        subcategories: ['Женская одежда', 'Мужская одежда', 'Обувь', 'Сумки и рюкзаки', 'Украшения'],
    },
];

export const mockPromos = [
    { title: 'Идём в школу',      subtitle: 'рюкзаки, канцтовары',        image: '/src/img/mock/teaching.png',      link: '/promo/school' },
    { title: 'Подарок за визит',  subtitle: 'заберите в течение суток',   image: '/src/img/mock/gift.png',          link: '/promo/gift' },
    { title: 'Сезон велосипедов', subtitle: 'подборка для города и гор', image: '/src/img/mock/mountain_bike.png', link: '/promo/bike' },
];

export const mockProducts = [
    { title: 'Велосипед горный',           price: '15 000', image: '/src/img/mock/mountain_bike.png', rating: '4,9', reviews: 296, delivery: false },
    { title: 'Велосипед шоссейный, б/у',   price: '45 000', image: '/src/img/mock/two_bicycles.png',  rating: '4,7', reviews: 143, delivery: false },
    { title: 'Рюкзак школьный',            price: '3 200',  image: '/src/img/mock/backpack.png',      rating: '4,4', reviews: 97,  delivery: true },
    { title: 'Диван раскладной, доставка', price: '48 000', image: '/src/img/mock/sofa.png',          rating: '4,6', reviews: 412, delivery: true },
    { title: 'Комплект книг для 5 класса', price: '1 500',  image: '/src/img/mock/teaching.png',      rating: '5,0', reviews: 58,  delivery: true },
    { title: 'Ноутбук игровой, гарантия',  price: '62 000', image: '/src/img/mock/computer.png',      rating: '4,8', reviews: 530, delivery: true },
];
