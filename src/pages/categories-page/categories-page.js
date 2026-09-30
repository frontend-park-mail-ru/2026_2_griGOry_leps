import './categories-page.scss';
import { CategoryCardFull } from '@/components/category-card-full/category-card-full.js';

const categories = [
    {
        slug: 'auto', name: 'Авто', image: '/src/img/cat-auto.jpg',
        subcategories: ['Легковые автомобили', 'Мотоциклы и мототехника', 'Грузовики и спецтехника', 'Водный транспорт', 'Шины и диски'],
    },
    {
        slug: 'realty', name: 'Недвижимость', image: '/src/img/cat-realty.jpg',
        subcategories: ['Квартиры', 'Комнаты', 'Дома и дачи', 'Земельные участки', 'Коммерческая недвижимость'],
    },
    {
        slug: 'rent', name: 'Жильё для путешествий', image: '/src/img/cat-rent.jpg',
        subcategories: ['Квартиры посуточно', 'Дома и коттеджи', 'Гостиницы', 'Хостелы', 'Глэмпинги'],
    },
    {
        slug: 'home', name: 'Для дома и дачи', image: '/src/img/cat-home.jpg',
        subcategories: ['Мебель', 'Бытовая техника', 'Посуда и кухня', 'Ремонт и строительство', 'Растения'],
    },
    {
        slug: 'parts', name: 'Запчасти', image: '/src/img/cat-parts.jpg',
        subcategories: ['Для автомобилей', 'Для мототехники', 'Масла и автохимия', 'Аккумуляторы', 'Инструменты'],
    },
    {
        slug: 'services', name: 'Услуги', image: '/src/img/cat-services.jpg',
        subcategories: ['Ремонт и отделка', 'Перевозки и грузчики', 'Обучение и курсы', 'Красота', 'Уборка'],
    },
    {
        slug: 'electronics', name: 'Электроника', image: '/src/img/cat-electronics.jpg',
        subcategories: ['Телефоны', 'Ноутбуки', 'Аудио и видео', 'Игры и приставки', 'Фототехника'],
    },
    {
        slug: 'jobs', name: 'Работа и подработка', image: '/src/img/cat-jobs.jpg',
        subcategories: ['Вакансии', 'Резюме', 'Подработка', 'Удалённая работа', 'Стажировки'],
    },
    {
        slug: 'biznes', name: 'Бизнес 360', image: '/src/img/cat-biznes.jpg',
        subcategories: ['Готовый бизнес', 'Оборудование', 'Франшизы', 'Помещения', 'Инвестиции'],
    },
    {
        slug: 'clothes', name: 'Одежда, обувь, аксессуары', image: '/src/img/cat-clothes.jpg',
        subcategories: ['Женская одежда', 'Мужская одежда', 'Обувь', 'Сумки и рюкзаки', 'Украшения'],
    },
    {
        slug: 'pets', name: 'Животные', image: '/src/img/cat-pets.jpg',
        subcategories: ['Собаки', 'Кошки', 'Птицы', 'Аквариум', 'Товары для питомцев'],
    },
    {
        slug: 'kids', name: 'Детские товары', image: '/src/img/cat-kids.jpg',
        subcategories: ['Детская одежда', 'Игрушки', 'Коляски', 'Автокресла', 'Питание'],
    },
];

export const CategoriesPage = (root) => {
    const cardsHtml = categories.map(CategoryCardFull).join('');

    root.innerHTML = `
        <div class="categories-page">

            <section class="categories-page">
                <div class="categories-page__head">
                    <h1>Все категории</h1>
                    <span class="categories-page__count">${categories.length} категорий</span>
                </div>

                <div class="categories-page__grid">
                    ${cardsHtml}
                </div>
            </section>

        </div>
    `;
};