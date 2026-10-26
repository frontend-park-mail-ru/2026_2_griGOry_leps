import './skeleton.scss';

export interface SkeletonProps {
    width?: number | string;
    height: number | string;
    radius?: number;
    circle?: boolean;
    class?: string;
}

const size = (value: number | string) => (typeof value === 'number' ? `${value}px` : value);

export const Skeleton = ({ width, height, radius, circle = false, class: className }: SkeletonProps) => {
    let borderRadius: string | undefined;
    if (circle) borderRadius = '50%';
    else if (radius !== undefined) borderRadius = `${radius}px`;

    return (
        <span
            class={className ? `skeleton ${className}` : 'skeleton'}
            style={{ width: width === undefined ? undefined : size(width), height: size(height), borderRadius }}
            aria-hidden="true"
        />
    );
};
