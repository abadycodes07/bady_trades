// Since @types/react-grid-layout might not be up-to-date or installed,
// provide basic type definitions to satisfy TypeScript.
// You can install @types/react-grid-layout for more complete typings.

declare module 'react-grid-layout' {
  import * as React from 'react';

  export interface Layout {
    i: string;
    x: number;
    y: number;
    w: number;
    h: number;
    minW?: number;
    maxW?: number;
    minH?: number;
    maxH?: number;
    moved?: boolean;
    static?: boolean;
    isDraggable?: boolean;
    isResizable?: boolean;
  }

  export type ResponsiveLayout = { lg?: Layout[]; md?: Layout[]; sm?: Layout[]; xs?: Layout[]; xxs?: Layout[] };
  export type Breakpoint = 'lg' | 'md' | 'sm' | 'xs' | 'xxs';
  export type Breakpoints = { [P in Breakpoint]?: number };
  export type Widths = { [P in Breakpoint]?: number };
  export type Cols = { [P in Breakpoint]?: number };

  export interface ResponsiveProps extends ReactGridLayoutProps {
    breakpoint?: string;
    breakpoints?: Breakpoints;
    cols?: Cols;
    layouts: ResponsiveLayout;
    width?: number;
    onBreakpointChange?(newBreakpoint: string, newCols: number): void;
    onLayoutChange?(currentLayout: Layout[], allLayouts: ResponsiveLayout): void;
    onWidthChange?(containerWidth: number, margin: [number, number], cols: number, containerPadding: [number, number]): void;
  }

  export class Responsive extends React.Component<ResponsiveProps> {}

  export interface ReactGridLayoutProps extends React.HTMLAttributes<HTMLDivElement> {
    className?: string;
    style?: React.CSSProperties;
    width?: number;
    autoSize?: boolean;
    cols?: number;
    draggableCancel?: string;
    draggableHandle?: string;
    verticalCompact?: boolean;
    compactType?: 'vertical' | 'horizontal' | null;
    layout?: Layout[];
    margin?: [number, number];
    containerPadding?: [number, number];
    rowHeight?: number;
    maxRows?: number;
    isBounded?: boolean;
    isDraggable?: boolean;
    isResizable?: boolean;
    allowOverlap?: boolean;
    preventCollision?: boolean;
    useCSSTransforms?: boolean;
    transformScale?: number;
    droppingItem?: { i: string; w: number; h: number };
    resizeHandles?: Array<'s' | 'w' | 'e' | 'n' | 'sw' | 'nw' | 'se' | 'ne'>;
    resizeHandle?: React.ReactNode | ((resizeHandleAxis: string) => React.ReactNode);
    onLayoutChange?(layout: Layout[]): void;
    onDragStart?(layout: Layout[], oldItem: Layout, newItem: Layout, placeholder: Layout, e: MouseEvent, element: HTMLElement): void;
    onDrag?(layout: Layout[], oldItem: Layout, newItem: Layout, placeholder: Layout, e: MouseEvent, element: HTMLElement): void;
    onDragStop?(layout: Layout[], oldItem: Layout, newItem: Layout, placeholder: Layout, e: MouseEvent, element: HTMLElement): void;
    onResizeStart?(layout: Layout[], oldItem: Layout, newItem: Layout, placeholder: Layout, e: MouseEvent, element: HTMLElement): void;
    onResize?(layout: Layout[], oldItem: Layout, newItem: Layout, placeholder: Layout, e: MouseEvent, element: HTMLElement): void;
    onResizeStop?(layout: Layout[], oldItem: Layout, newItem: Layout, placeholder: Layout, e: MouseEvent, element: HTMLElement): void;
    onDrop?(layout: Layout[], item: Layout, e: Event): void;
    onDropDragOver?(e: DragOverEvent): { w?: number; h?: number } | false;
    children?: React.ReactNode;
    innerRef?: React.Ref<HTMLDivElement>;
  }

  export class GridLayout extends React.Component<ReactGridLayoutProps> {}

  export function WidthProvider<P>(
    component: React.ComponentType<P & { width: number; measureBeforeMount?: boolean }>
  ): React.ComponentType<P & { measureBeforeMount?: boolean }>;

}

declare module 'react-resizable' {
    import * as React from 'react';

    export type Axis = 'both' | 'x' | 'y' | 'none';
    export type ResizeHandle = 's' | 'w' | 'e' | 'n' | 'sw' | 'nw' | 'se' | 'ne';

    export interface ResizableState {
        width: number;
        height: number;
        propsWidth: number;
        propsHeight: number;
    }

    export interface DragCallbackData {
        node: HTMLElement;
        x: number;
        y: number;
        deltaX: number;
        deltaY: number;
        lastX: number;
        lastY: number;
    }

    export interface ResizeCallbackData {
        node: HTMLElement;
        size: { width: number; height: number };
        handle: ResizeHandle;
    }

    export interface ResizableProps {
        children: React.ReactElement<any>;
        className?: string;
        width: number;
        height: number;
        handleSize?: [number, number];
        lockAspectRatio?: boolean;
        axis?: Axis;
        minConstraints?: [number, number];
        maxConstraints?: [number, number];
        onResizeStop?: (e: React.SyntheticEvent, data: ResizeCallbackData) => any;
        onResizeStart?: (e: React.SyntheticEvent, data: ResizeCallbackData) => any;
        onResize?: (e: React.SyntheticEvent, data: ResizeCallbackData) => any;
        draggableOpts?: any;
        resizeHandles?: ResizeHandle[];
        handle?: React.ReactNode | ((resizeHandle: ResizeHandle, ref: React.RefObject<any>) => React.ReactNode);
    }

    export class Resizable extends React.Component<ResizableProps, ResizableState> {}

    export interface ResizableBoxState {
        width: number;
        height: number;
        propsWidth: number;
        propsHeight: number;
    }

    export interface ResizableBoxProps extends ResizableProps {
        style?: React.CSSProperties;
    }

    export class ResizableBox extends React.Component<ResizableBoxProps, ResizableBoxState> {}
}
