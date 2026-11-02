import type { Child } from '@/vdom';
import type { RouteParams } from '@/router/router';

export type Layout = 'main' | 'auth';

export type Tone = 'white' | 'gray';

export interface PageView {
    name: string;
    layout: Layout;
    tone: Tone;
    view: () => Child;
}

export interface Page<T> {
    name: string;
    layout?: Layout;
    tone?: Tone;
    load?: (params: RouteParams) => Promise<T>;
    view: (data: T, params: RouteParams) => Child;
}
