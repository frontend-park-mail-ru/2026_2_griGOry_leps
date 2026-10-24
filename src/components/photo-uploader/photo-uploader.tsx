import { Component } from '@/vdom';
import './photo-uploader.scss';

export interface PhotoItem {
    key: string;
    id: number | null;
    preview: string;
    uploading: boolean;
    error: string;
}

export interface PhotoUploaderProps {
    photos: PhotoItem[];
    max: number;
    error?: string;
    onAdd: (files: File[]) => void;
    onRemove: (key: string) => void;
    onMove: (key: string, target: string) => void;
}

const MIN_SLOTS = 4;

export class PhotoUploader extends Component<PhotoUploaderProps, { dragKey: string | null; overKey: string | null }> {
    state = { dragKey: null as string | null, overKey: null as string | null };

    handleChange = (e: Event) => {
        const input = e.target as HTMLInputElement;
        const files = Array.from(input.files ?? []);
        input.value = '';
        if (files.length) this.props.onAdd(files);
    };

    handleDragStart = (key: string) => (e: DragEvent) => {
        e.dataTransfer?.setData('text/plain', key);
        if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
        this.setState({ dragKey: key });
    };

    handleDragOver = (key: string) => (e: DragEvent) => {
        if (!this.state.dragKey) return;
        e.preventDefault();
        if (this.state.overKey !== key) this.setState({ overKey: key });
    };

    handleDrop = (key: string) => (e: DragEvent) => {
        e.preventDefault();
        const { dragKey } = this.state;
        if (dragKey && dragKey !== key) this.props.onMove(dragKey, key);
        this.setState({ dragKey: null, overKey: null });
    };

    handleDragEnd = () => {
        this.setState({ dragKey: null, overKey: null });
    };

    handleFileDrop = (e: DragEvent) => {
        e.preventDefault();
        const files = Array.from(e.dataTransfer?.files ?? []);
        if (files.length) this.props.onAdd(files);
    };

    handleFileDragOver = (e: DragEvent) => {
        if (e.dataTransfer?.types.includes('Files')) e.preventDefault();
    };

    renderPhoto(photo: PhotoItem, index: number) {
        const { dragKey, overKey } = this.state;
        const classes = ['photo-uploader__item'];
        if (photo.uploading) classes.push('photo-uploader__item--loading');
        if (photo.error) classes.push('photo-uploader__item--failed');
        if (dragKey === photo.key) classes.push('photo-uploader__item--dragging');
        if (overKey === photo.key && dragKey !== photo.key) classes.push('photo-uploader__item--over');

        return (
            <li
                key={photo.key}
                class={classes.join(' ')}
                draggable={photo.uploading ? 'false' : 'true'}
                onDragStart={this.handleDragStart(photo.key)}
                onDragOver={this.handleDragOver(photo.key)}
                onDrop={this.handleDrop(photo.key)}
                onDragEnd={this.handleDragEnd}
            >
                <img src={photo.preview} alt={`Фото ${index + 1}`} draggable="false" />
                {index === 0 && !photo.error && <span class="photo-uploader__badge">Главное</span>}
                {photo.uploading && <span class="photo-uploader__spinner" aria-label="Загрузка" />}
                {photo.error && <span class="photo-uploader__failed">{photo.error}</span>}
                <button
                    type="button"
                    class="photo-uploader__remove"
                    aria-label={`Удалить фото ${index + 1}`}
                    onClick={() => this.props.onRemove(photo.key)}
                >×</button>
            </li>
        );
    }

    renderSlot(index: number) {
        const { error } = this.props;
        const primary = index === 0;
        const classes = ['photo-uploader__slot'];
        if (primary) classes.push('photo-uploader__slot--primary');

        return (
            <li key={`slot-${index}`} class={classes.join(' ')} onDragOver={this.handleFileDragOver} onDrop={this.handleFileDrop}>
                <label class="photo-uploader__slot-label">
                    <input
                        class="visually-hidden"
                        type="file"
                        name={primary ? 'photos' : undefined}
                        accept="image/jpeg,image/png"
                        multiple
                        tabindex={primary ? undefined : '-1'}
                        onChange={this.handleChange}
                    />
                    <span class="photo-uploader__plus" aria-hidden="true">+</span>
                    {error && primary ? 'Добавьте фото' : 'Добавить фото'}
                </label>
            </li>
        );
    }

    render() {
        const { photos, max, error } = this.props;
        const slots = photos.length >= max ? 0 : Math.max(1, Math.min(MIN_SLOTS - photos.length, max - photos.length));

        return (
            <div class={error ? 'photo-uploader photo-uploader--error' : 'photo-uploader'}>
                <ul class="photo-uploader__list">
                    {photos.map((photo, i) => this.renderPhoto(photo, i))}
                    {Array.from({ length: slots }, (_, i) => this.renderSlot(i))}
                </ul>
                <p class="form-field__error" data-error-for="photos">{error || null}</p>
            </div>
        );
    }
}
