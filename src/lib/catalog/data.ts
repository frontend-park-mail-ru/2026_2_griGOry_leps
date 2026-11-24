export interface CategoryLink {
    slug: string;
    name: string;
}

export interface Category extends CategoryLink {
    image?: string;
    subcategories: CategoryLink[];
}

export interface Promo {
    title: string;
    subtitle: string;
    image: string;
}

// Иллюстрации для известных корневых категорий.
export const categoryCovers: Readonly<Record<string, string>> = {
    auto: '/img/categories/auto.jpg',
    realty: '/img/categories/realty.jpg',
    rent: '/img/categories/rent.jpg',
    home: '/img/categories/home.jpg',
    parts: '/img/categories/parts.jpg',
    services: '/img/categories/services.jpg',
    electronics: '/img/categories/electronics.jpg',
    jobs: '/img/categories/jobs.jpg',
    biznes: '/img/categories/biznes.jpg',
    clothes: '/img/categories/clothes.jpg',
    pets: '/img/categories/pets.jpg',
    kids: '/img/categories/kids.jpg',
    beauty: '/img/categories/beauty.jpg',
    sport: '/img/categories/sport.jpg',
    books: '/img/categories/books.jpg',
    hobby: '/img/categories/hobby.jpg',
};

export const mockPromos: Promo[] = [
    { title: 'Идём в школу',      subtitle: 'рюкзаки, канцтовары',        image: '/img/promo/school.jpg' },
    { title: 'Подарок за визит',  subtitle: 'заберите в течение суток',   image: '/img/promo/gift.jpg' },
    { title: 'Сезон велосипедов', subtitle: 'подборка для города и гор', image: '/img/promo/bike.jpg' },
];
