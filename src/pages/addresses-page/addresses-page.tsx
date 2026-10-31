import { Component } from '@/vdom';
import {
    createAddress,
    deleteAddress,
    getAddresses,
    updateAddress,
    type Address,
    type AddressData,
    type Profile,
} from '@/lib/api';
import { FormValidation, describeApiError, type FieldRule, type FormValues } from '@/lib/form';
import { LIMITS, validateMaxLength } from '@/lib/validators';
import { logError } from '@/lib/logger';
import { ProfileLayout } from '@/components/profile-layout/profile-layout';
import { FormField } from '@/components/form-field/form-field';
import { PageError } from '@/components/page-error/page-error';
import { Skeleton } from '@/components/skeleton/skeleton';
import { TextareaField } from '@/components/textarea-field/textarea-field';
import { DeleteAddressModal } from '@/components/delete-address-modal/delete-address-modal';
import { Toast } from '@/components/toast/toast';
import { ToastTimer, type ToastState } from '@/lib/toast';
import './addresses-page.scss';

const trim = (value: string) => value.trim();

const RULES: Record<string, FieldRule> = {
    street: { validate: validateMaxLength(LIMITS.streetMax), normalize: trim, required: 'Укажите город и улицу' },
    house: { validate: validateMaxLength(LIMITS.houseMax), normalize: trim, required: 'Укажите дом и квартиру' },
    comment: { validate: validateMaxLength(LIMITS.courierCommentMax) },
};

const EMPTY_VALUES: FormValues = { street: '', house: '', comment: '' };

const PlusIcon = () => (
    <svg viewBox="0 0 20 20" width="20" height="20" fill="none"
        stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
        <path d="M10 4v12M4 10h12" />
    </svg>
);

function addressValues(address: Address | null): FormValues {
    if (!address) return { ...EMPTY_VALUES };
    return { street: address.street, house: address.house, comment: address.comment ?? '' };
}

function pickAddress(addresses: Address[]): Address | null {
    return addresses.find(({ is_default }) => is_default) ?? addresses[0] ?? null;
}

function applySaved(addresses: Address[], saved: Address): Address[] {
    const exists = addresses.some(({ id }) => id === saved.id);
    const next = exists
        ? addresses.map((address) => (address.id === saved.id ? saved : address))
        : [...addresses, saved];
    return saved.is_default
        ? next.map((address) => (address.id === saved.id ? address : { ...address, is_default: false }))
        : next;
}

export interface AddressesPageProps {
    profile: Profile;
    onLogout: () => Promise<void>;
}

export interface AddressesPageState {
    status: 'loading' | 'error' | 'ready';
    addresses: Address[];
    selectedId: number | null;
    values: FormValues;
    errors: FormValues;
    isDefault: boolean;
    saving: boolean;
    confirmDelete: boolean;
    deleting: boolean;
    deleteError: string;
    toast: ToastState | null;
}

export class AddressesPage extends Component<AddressesPageProps, AddressesPageState> {
    validation: FormValidation;

    toasts = new ToastTimer((toast) => this.setState({ toast }));

    constructor(props: AddressesPageProps) {
        super(props);

        this.validation = new FormValidation(RULES, () => this.syncValidation());
        this.state = {
            status: 'loading',
            addresses: [],
            selectedId: null,
            values: { ...this.validation.values },
            errors: {},
            isDefault: false,
            saving: false,
            confirmDelete: false,
            deleting: false,
            deleteError: '',
            toast: null,
        };
    }

    componentDidMount() {
        void this.load();
    }

    componentWillUnmount() {
        this.validation.destroy();
        this.toasts.stop();
    }

    load = async () => {
        this.setState({ status: 'loading' });
        try {
            const addresses = await getAddresses();
            this.setState({ status: 'ready', addresses });
            this.selectAddress(pickAddress(addresses));
        } catch (err) {
            logError('Не удалось загрузить адреса:', err);
            this.setState({ status: 'error' });
        }
    };

    syncValidation() {
        this.setState({
            values: { ...this.validation.values },
            errors: { ...this.validation.errors },
        });
    }

    selectAddress(address: Address | null) {
        this.validation.validateTouchedDebounced.cancel();
        this.validation.values = addressValues(address);
        this.validation.errors = {};
        this.validation.touched.clear();
        this.validation.submitted = false;
        this.setState(({ addresses }) => ({
            selectedId: address ? address.id : null,
            values: { ...this.validation.values },
            errors: {},
            isDefault: address ? address.is_default : addresses.length === 0,
        }));
    }

    selectedAddress(): Address | null {
        const { addresses, selectedId } = this.state;
        return addresses.find(({ id }) => id === selectedId) ?? null;
    }

    handleSelect = (address: Address) => {
        if (!this.state.saving) this.selectAddress(address);
    };

    handleAdd = () => {
        if (!this.state.saving) this.selectAddress(null);
    };

    handleInput = (e: Event) => {
        const input = e.target as HTMLInputElement | HTMLTextAreaElement;
        this.validation.input(input.name, input.value);
    };

    handleChange = (e: Event) => {
        this.validation.change((e.target as HTMLInputElement | HTMLTextAreaElement).name);
    };

    handleDefaultChange = (e: Event) => {
        this.setState({ isDefault: (e.target as HTMLInputElement).checked });
    };

    handleCancel = () => {
        const selected = this.selectedAddress();
        this.selectAddress(selected ?? pickAddress(this.state.addresses));
    };

    handleSubmit = async (e: SubmitEvent) => {
        e.preventDefault();
        if (this.state.saving) return;

        const values = this.validation.validateAll();
        if (!values) return;

        const { selectedId, isDefault, addresses } = this.state;
        const data: AddressData = {
            street: values.street,
            house: values.house,
            comment: values.comment.trim(),
            is_default: isDefault || addresses.length === 0,
        };

        this.setState({ saving: true });
        try {
            const saved = selectedId === null ? await createAddress(data) : await updateAddress(selectedId, data);
            this.setState(({ addresses: current }) => ({ addresses: applySaved(current, saved) }));
            this.selectAddress(saved);
            this.toasts.show('success', 'Адрес сохранён');
        } catch (err) {
            logError('Не удалось сохранить адрес:', err);
            const { field, message } = describeApiError(err, {
                fields: Object.keys(RULES),
                fallback: 'Не удалось сохранить адрес. Попробуйте ещё раз',
            });
            if (field) this.validation.setError(field, message);
            else this.toasts.show('error', message);
        } finally {
            this.setState({ saving: false });
        }
    };

    openDelete = () => {
        this.setState({ confirmDelete: true, deleteError: '' });
    };

    closeDelete = () => {
        if (!this.state.deleting) this.setState({ confirmDelete: false, deleteError: '' });
    };

    async reloadAfterDelete(deletedId: number): Promise<Address[]> {
        try {
            return await getAddresses();
        } catch (err) {
            logError('Не удалось обновить адреса после удаления:', err);
            return this.state.addresses.filter(({ id }) => id !== deletedId);
        }
    }

    confirmDelete = async () => {
        const address = this.selectedAddress();
        if (!address) return;

        this.setState({ deleting: true, deleteError: '' });
        try {
            await deleteAddress(address.id);
            const addresses = await this.reloadAfterDelete(address.id);
            this.setState({ addresses, confirmDelete: false, deleting: false });
            this.selectAddress(pickAddress(addresses));
            this.toasts.show('success', 'Адрес удалён');
        } catch (err) {
            logError('Не удалось удалить адрес:', err);
            const { message } = describeApiError(err, { fields: [], fallback: 'Не удалось удалить адрес. Попробуйте ещё раз' });
            this.setState({ deleting: false, deleteError: message });
        }
    };

    fieldProps(name: string) {
        return {
            name,
            large: true,
            value: this.state.values[name],
            error: this.state.errors[name],
            onInput: this.handleInput,
            onChange: this.handleChange,
        };
    }

    renderSaved() {
        const { addresses, selectedId } = this.state;

        return (
            <div class="addresses__saved" role="radiogroup" aria-label="Сохранённые адреса">
                {addresses.map((address) => {
                    const selected = address.id === selectedId;
                    return (
                        <label
                            key={address.id}
                            class={selected ? 'addresses__option addresses__option--selected' : 'addresses__option'}
                            data-address-id={address.id}
                        >
                            <input
                                type="radio"
                                name="address"
                                value={String(address.id)}
                                class="addresses__radio"
                                checked={selected}
                                onChange={() => this.handleSelect(address)}
                            />
                            <span class="addresses__option-text">
                                <span class="addresses__option-title">{address.street}</span>
                                <span class="addresses__option-description">
                                    {address.is_default ? `${address.house} · основной` : address.house}
                                </span>
                            </span>
                        </label>
                    );
                })}
                <button
                    type="button"
                    class={selectedId === null ? 'addresses__add addresses__add--active' : 'addresses__add'}
                    onClick={this.handleAdd}
                >
                    <PlusIcon />
                    Добавить адрес
                </button>
            </div>
        );
    }

    renderForm() {
        const { values, errors, selectedId, isDefault, saving, addresses } = this.state;
        const isNew = selectedId === null;
        const selected = this.selectedAddress();

        return (
            <form class="addresses__form" novalidate onSubmit={this.handleSubmit}>
                <h2 class="addresses__form-title">{isNew ? 'Новый адрес' : 'Изменить адрес'}</h2>

                <div class="addresses__street">
                    <FormField
                        {...this.fieldProps('street')}
                        id="address-street"
                        label="Город и улица"
                        placeholder="Например, Москва, ул. Тверская"
                        autocomplete="street-address"
                    />
                    <button type="button" class="addresses__map" disabled title="Скоро">Указать на карте</button>
                </div>

                <FormField
                    {...this.fieldProps('house')}
                    id="address-house"
                    label="Дом и квартира"
                    placeholder="Например, д. 12, кв. 34"
                />

                <TextareaField
                    id="address-comment"
                    name="comment"
                    label="Комментарий курьеру"
                    placeholder="Подъезд, домофон, этаж"
                    value={values.comment ?? ''}
                    maxLength={LIMITS.courierCommentMax}
                    height={112}
                    error={errors.comment}
                    onInput={this.handleInput}
                    onChange={this.handleChange}
                />

                {(addresses.length > 0 && !selected?.is_default) && (
                    <label class="addresses__default">
                        <input
                            type="checkbox"
                            class="addresses__checkbox"
                            checked={isDefault}
                            onChange={this.handleDefaultChange}
                        />
                        Сделать основным адресом
                    </label>
                )}

                <div class="addresses__actions">
                    <button type="submit" class="addresses__save" disabled={saving}>
                        {saving ? 'Сохраняем…' : 'Сохранить адрес'}
                    </button>
                    <button type="button" class="addresses__cancel" disabled={saving} onClick={this.handleCancel}>
                        Отмена
                    </button>
                    {!isNew && (
                        <button type="button" class="addresses__delete" disabled={saving} onClick={this.openDelete}>
                            Удалить
                        </button>
                    )}
                </div>

                <p class="addresses__note">Адрес можно изменить или удалить в любой момент</p>
            </form>
        );
    }

    renderDeleteModal() {
        const { confirmDelete, deleting, deleteError } = this.state;
        const address = this.selectedAddress();
        if (!confirmDelete || !address) return null;

        return (
            <DeleteAddressModal
                address={address}
                pending={deleting}
                error={deleteError}
                onConfirm={this.confirmDelete}
                onClose={this.closeDelete}
            />
        );
    }

    renderContent() {
        const { status } = this.state;

        if (status === 'loading') {
            return (
                <div class="addresses__skeleton" aria-busy="true" aria-label="Загрузка">
                    <Skeleton width={300} height={73} radius={12} />
                    <Skeleton width={300} height={73} radius={12} />
                    <Skeleton width={200} height={73} radius={12} />
                </div>
            );
        }
        if (status === 'error') return <PageError onRetry={this.load} />;

        return (
            <>
                {this.renderSaved()}
                {this.renderForm()}
            </>
        );
    }

    render() {
        const { profile, onLogout } = this.props;
        const { toast } = this.state;

        return (
            <ProfileLayout profile={profile} active="addresses" onLogout={onLogout}>
                <section class="addresses">
                    <h1 class="addresses__title">Адреса доставки</h1>
                    {this.renderContent()}
                </section>
                {this.renderDeleteModal()}
                {toast && <Toast key={toast.id} type={toast.type} message={toast.message} />}
            </ProfileLayout>
        );
    }
}
