import { Component } from '@/vdom';
import './verify-email-page.scss';

import { AuthHeader } from '@/components/auth-header/auth-header';
import { AuthCard, type AuthCardIcon } from '@/components/auth-card/auth-card';
import { Button } from '@/components/button/button';

import { ApiError, getMe, resendVerification, resendVerificationByLink, verifyEmail } from '@/lib/api';
import { describeApiError } from '@/lib/form';
import { formatCountdown } from '@/lib/format';
import { logWarn } from '@/lib/logger';
import { navigate, redirect } from '@/router/router';
import { getUser, setUser } from '@/store';

const RESEND_DELAY_S = 60;

export type VerifyStatus = 'pending' | 'resent' | 'verified' | 'already' | 'expired' | 'taken';

export interface VerifyEmailProps {
    token: string;
    status: VerifyStatus;
    email: string;
    emailChange: boolean;
    justSent: boolean;
}

async function refreshUser() {
    const me = await getMe().catch(() => null);
    if (me) setUser(me);
    return me;
}

export async function loadVerifyEmail(): Promise<VerifyEmailProps> {
    const params = new URLSearchParams(location.search);
    const token = params.get('token') ?? '';
    const base = { token, email: '', emailChange: false, justSent: params.has('sent') };

    if (!token) {
        const me = getUser() ? await refreshUser() : null;
        if (!me) return { ...base, status: 'expired' };
        if (me.pending_email) return { ...base, status: 'pending', email: me.pending_email, emailChange: true };
        if (!me.email_verified) return { ...base, status: 'pending', email: me.email };
        return { ...base, status: 'already', email: me.email };
    }

    try {
        const result = await verifyEmail(token);
        if (getUser()) await refreshUser();
        return { ...base, status: 'verified', email: result.email, emailChange: result.changed };
    } catch (err) {
        if (!(err instanceof ApiError)) throw err;
        if (err.status === 400) return { ...base, status: 'expired', email: err.email };
        if (err.status === 409 && err.field === 'email') return { ...base, status: 'taken' };
        if (err.status === 409) return { ...base, status: 'already' };
        throw err;
    }
}

export interface VerifyEmailState {
    status: VerifyStatus;
    email: string;
    secondsLeft: number;
    sending: boolean;
    formError: string;
}

interface Screen {
    icon: AuthCardIcon;
    title: string;
    text: string;
}

export class VerifyEmailPage extends Component<VerifyEmailProps, VerifyEmailState> {
    timer: ReturnType<typeof setInterval> | null = null;

    constructor(props: VerifyEmailProps) {
        super(props);
        this.state = {
            status: props.status,
            email: props.email,
            secondsLeft: 0,
            sending: false,
            formError: '',
        };
    }

    componentDidMount() {
        if (this.props.status === 'verified' && this.props.emailChange && getUser()) {
            redirect('/profile/edit?email=confirmed');
            return;
        }
        if (this.props.justSent) this.startTimer(RESEND_DELAY_S);
    }

    componentWillUnmount() {
        this.stopTimer();
    }

    startTimer(seconds: number) {
        this.stopTimer();
        this.setState({ secondsLeft: seconds });
        this.timer = setInterval(() => {
            const secondsLeft = this.state.secondsLeft - 1;
            this.setState({ secondsLeft });
            if (secondsLeft <= 0) this.stopTimer();
        }, 1000);
    }

    stopTimer() {
        if (this.timer !== null) clearInterval(this.timer);
        this.timer = null;
    }

    handleResend = async () => {
        this.setState({ sending: true, formError: '' });
        try {
            const email = getUser()
                ? await resendVerification()
                : await resendVerificationByLink(this.props.token);
            this.setState({ status: 'resent', email });
            this.startTimer(RESEND_DELAY_S);
        } catch (err) {
            logWarn('Не удалось отправить письмо для подтверждения:', err);
            if (err instanceof ApiError && err.status === 429 && err.retryAfter > 0) {
                this.startTimer(err.retryAfter);
            } else if (err instanceof ApiError && err.status === 409) {
                this.setState({ status: 'already' });
            } else {
                const { message } = describeApiError(err, {
                    fields: [],
                    fallback: 'Не удалось отправить письмо. Попробуйте ещё раз',
                });
                this.setState({ formError: message });
            }
        } finally {
            this.setState({ sending: false });
        }
    };

    screen(): Screen {
        const { status, email } = this.state;
        const loggedIn = Boolean(getUser());

        switch (status) {
            case 'resent':
                return {
                    icon: 'mail',
                    title: 'Письмо отправлено ещё раз',
                    text: `Проверьте ${email}. Работает только ссылка из последнего письма, она действует 30 минут.`,
                };
            case 'verified':
                if (this.props.emailChange) {
                    return {
                        icon: 'success',
                        title: 'Новая почта подтверждена',
                        text: `Теперь входите и получайте письма на ${email}. Старая почта к аккаунту больше не привязана.`,
                    };
                }
                return {
                    icon: 'success',
                    title: 'Почта подтверждена',
                    text: 'Регистрация завершена. Теперь можно покупать, продавать и писать продавцам.',
                };
            case 'already':
                return {
                    icon: 'success',
                    title: 'Почта уже подтверждена',
                    text: loggedIn
                        ? 'Эта ссылка уже использована, аккаунт активен.'
                        : 'Эта ссылка уже использована, аккаунт активен. Войдите, чтобы продолжить.',
                };
            case 'expired':
                return {
                    icon: 'expired',
                    title: 'Ссылка устарела',
                    text: email
                        ? `Ссылка для подтверждения почты действует 30 минут и только один раз. Отправим новую на ${email}.`
                        : 'Ссылка для подтверждения почты действует 30 минут и только один раз. Войдите, чтобы отправить новую.',
                };
            case 'taken':
                return {
                    icon: 'expired',
                    title: 'Почта уже занята',
                    text: 'Пока письмо шло, эту почту привязали к другому аккаунту. Укажите другую почту в профиле.',
                };
            default:
                return {
                    icon: 'mail',
                    title: 'Подтвердите почту',
                    text: `Отправили письмо на ${email}. Перейдите по ссылке в нём, чтобы `
                        + `${this.props.emailChange ? 'подтвердить новую почту' : 'закончить регистрацию'}. `
                        + 'Ссылка действует 30 минут. Не пришло — проверьте папку «Спам».',
                };
        }
    }

    renderResendButton(label: string) {
        const { secondsLeft, sending } = this.state;
        if (secondsLeft > 0) {
            return <Button text={`Отправить ещё раз через ${formatCountdown(secondsLeft)}`} block disabled />;
        }
        return <Button text={label} block disabled={sending} onClick={this.handleResend} />;
    }

    renderActions() {
        const { status, email } = this.state;
        const loggedIn = Boolean(getUser());
        const changeLink = <a href="/profile/edit" data-link class="verify-email-page__link">Изменить email</a>;

        switch (status) {
            case 'pending':
                return [this.renderResendButton('Отправить письмо ещё раз'), changeLink];
            case 'resent':
                return [this.renderResendButton('Отправить письмо ещё раз'), changeLink];
            case 'verified':
                if (this.props.emailChange && !loggedIn) {
                    return <Button text="Войти" block onClick={() => navigate('/login')} />;
                }
                return <Button text="Перейти к объявлениям" block onClick={() => navigate('/')} />;
            case 'already':
                return loggedIn
                    ? <Button text="Перейти к объявлениям" block onClick={() => navigate('/')} />
                    : <Button text="Войти" block onClick={() => navigate('/login')} />;
            case 'taken':
                return <Button text="Перейти в профиль" block onClick={() => navigate('/profile/edit')} />;
            default:
                if (email || loggedIn) return [this.renderResendButton('Отправить новую ссылку'), changeLink];
                return <Button text="Войти" block onClick={() => navigate('/login')} />;
        }
    }

    render() {
        const { icon, title, text } = this.screen();
        const { formError } = this.state;

        return (
            <div class="verify-email-page">
                <AuthHeader />
                <div class="verify-email-page__content">
                    <AuthCard icon={icon} title={title} subtitle={text}>
                        <div class="verify-email-page__actions">
                            {this.renderActions()}
                            {formError && <p class="verify-email-page__error" role="alert">{formError}</p>}
                        </div>
                    </AuthCard>
                </div>
            </div>
        );
    }
}
