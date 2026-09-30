export const mockCategories = [
    { slug: 'auto',   name: 'Авто',                  image: '/src/img/cat-auto.jpg' },
    { slug: 'realty', name: 'Недвижимость',          image: '/src/img/cat-realty.jpg' },
    { slug: 'rent',   name: 'Жильё для путешествий', image: '/src/img/cat-rent.jpg' },
    { slug: 'home',   name: 'Для дома и дачи',       image: '/src/img/cat-home.jpg' },
    { slug: 'parts',       name: 'Запчасти',              image: '/src/img/cat-parts.jpg' },
    { slug: 'services',    name: 'Услуги',                image: '/src/img/cat-services.jpg' },
    { slug: 'electronics', name: 'Электроника',           image: '/src/img/cat-electronics.jpg' },
    { slug: 'jobs',        name: 'Работа и подработка',   image: '/src/img/cat-jobs.jpg' },
    { slug: 'biznes',      name: 'Бизнес 360',            image: '/src/img/cat-biznes.jpg' },
    { slug: 'clothes',     name: 'Одежда, обувь',         image: '/src/img/cat-clothes.jpg' },
];

export const mockPromos = [
    { title: 'Идём в школу',      subtitle: 'рюкзаки, канцтовары',        image: '/src/img/promo-school.jpg', link: '/promo/school' },
    { title: 'Подарок за визит',  subtitle: 'заберите в течение суток',   image: '/src/img/promo-gift.jpg',   link: '/promo/gift' },
    { title: 'Сезон велосипедов', subtitle: 'подборка для города и гор', image: '/src/img/promo-bike.jpg',   link: '/promo/bike' },
];

export const mockProducts = [
    { title: 'Велосипед горный',           price: '15 000', image: '/src/img/p1.jpg', rating: '4,9', reviews: 296, delivery: false },
    { title: 'Велосипед шоссейный, б/у',   price: '45 000', image: '/src/img/p2.jpg', rating: '4,7', reviews: 143, delivery: false },
    { title: 'Рюкзак школьный',            price: '3 200',  image: '/src/img/p3.jpg', rating: '4,4', reviews: 97,  delivery: true },
    { title: 'Диван раскладной, доставка', price: '48 000', image: '/src/img/p4.jpg', rating: '4,6', reviews: 412, delivery: true },
    { title: 'Комплект книг для 5 класса', price: '1 500',  image: '/src/img/p5.jpg', rating: '5,0', reviews: 58,  delivery: true },
    { title: 'Ноутбук игровой, гарантия',  price: '62 000', image: '/src/img/p6.jpg', rating: '4,8', reviews: 530, delivery: true },
];

export const mockCategoryNames = {
    auto:        'Авто',
    realty:      'Недвижимость',
    rent:        'Жильё для путешествий',
    home:        'Для дома и дачи',
    parts:       'Запчасти',
    services:    'Услуги',
    electronics: 'Электроника',
    jobs:        'Работа и подработка',
    biznes:      'Бизнес 360',
    clothes:     'Одежда, обувь',
};