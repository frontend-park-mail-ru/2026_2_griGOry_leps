import './terms-page.scss';
import { Breadcrumbs } from '@/components/breadcrumbs/breadcrumbs';

export const TermsPage = () => (
    <div class="terms-page">

        <Breadcrumbs items={[{ label: 'Главная', href: '/' }, { label: 'Условия использования' }]} />

        <article class="terms-page__content">
            <h1 class="terms-page__title">Пользовательское соглашение GoGet</h1>

            <section class="terms-page__section">
                <h2 class="terms-page__section-title">1. Общие положения</h2>
                <p class="terms-page__text">
                    Настоящее соглашение регулирует использование сервиса объявлений GoGet.
                    Регистрируясь и пользуясь сервисом, вы подтверждаете, что прочитали
                    и приняли эти условия.
                </p>
            </section>

            <section class="terms-page__section">
                <h2 class="terms-page__section-title">2. Регистрация и аккаунт</h2>
                <p class="terms-page__text">
                    Для размещения объявлений и связи с продавцами необходимо создать аккаунт.
                    Вы обязуетесь указывать достоверные данные и не передавать доступ
                    к аккаунту третьим лицам. Ответственность за действия, совершённые
                    из-под вашего аккаунта, лежит на вас.
                </p>
            </section>

            <section class="terms-page__section">
                <h2 class="terms-page__section-title">3. Размещение объявлений</h2>
                <p class="terms-page__text">
                    Пользователь самостоятельно отвечает за содержание своих объявлений.
                    Запрещено размещать товары и услуги, продажа которых ограничена
                    законодательством, а также вводить покупателей в заблуждение.
                </p>
            </section>

            <section class="terms-page__section">
                <h2 class="terms-page__section-title">4. Персональные данные</h2>
                <p class="terms-page__text">
                    Телефон и email используются для связи между покупателями и продавцами
                    и для входа в аккаунт. Мы не передаём ваши данные третьим лицам
                    без вашего согласия, за исключением случаев, предусмотренных законом.
                </p>
            </section>

            <section class="terms-page__section">
                <h2 class="terms-page__section-title">5. Ответственность сторон</h2>
                <p class="terms-page__text">
                    GoGet предоставляет площадку для публикации объявлений и не является
                    стороной сделок между пользователями. Сервис вправе удалять объявления
                    и ограничивать доступ к аккаунту при нарушении этих условий.
                </p>
            </section>

            <section class="terms-page__section">
                <h2 class="terms-page__section-title">6. Изменение условий</h2>
                <p class="terms-page__text">
                    Мы можем обновлять соглашение. Актуальная версия всегда доступна
                    на этой странице, продолжение использования сервиса означает
                    согласие с изменениями.
                </p>
            </section>
        </article>

    </div>
);
