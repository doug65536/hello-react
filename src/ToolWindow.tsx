import React, { ClassAttributes } from "react";
import { DragDispatcher, DragDispatcherListener } from "./DragDispatcher";
import './ToolWindow.css';

interface ToolWindowPropsBase<T extends ResizableChild> {
  childRef?: (el: T | null) => void;
  title?: string;
  defaultLeft?: number;
  defaultTop?: number;
  defaultWidth?: number;
  defaultHeight?: number;
  minHeight?: number;
  minWidth?: number;

  onMove?: (toolWindow: ToolWindow<T>, 
      left: number, top: number, right: number, bottom: number) => void;
}

export type ToolWindowProps<T extends ResizableChild> = 
    React.PropsWithChildren<ToolWindowPropsBase<T>>;

interface ToolWindowDragData {
  dragPX: number;
  dragPY: number;
  dragSX: number;
  dragSY: number;
  dragType: string;
}

enum SizingElement {
  TOP,
  TOPLEFT,
  LEFT,
  BOTTOMLEFT,
  BOTTOM,
  BOTTOMRIGHT,
  RIGHT,
  TOPRIGHT
}

export class ToolWindow<T extends ResizableChild> 
    extends React.Component<ToolWindowProps<T>>
    implements ResizableChild, DragDispatcherListener<ToolWindowDragData> {
  public title: string = 'Untitled';
  private titleElement: HTMLDivElement | null = null;
  private clientElement: HTMLDivElement | null = null;

  private px: number = 0;
  private py: number = 0;
  private sx: number = 0;
  private sy: number = 0;
  private minWidth: number = 0;
  private minHeight: number = 0;
  private titleHeight: number = 25;
  private resizableChildren: (T | null)[] = [];
  private resizingElements: (Element | null)[] = [];
  private handleHalfSize: number = 9;
  private changed: boolean = false;
  private clampLeft: number = 0;
  private clampTop: number = 0;
  private clampRight: number = window.innerWidth;
  private clampBottom: number = window.innerHeight;
  private canAutoClamp: boolean = false;

  private dragDispatcher = new DragDispatcher<ToolWindowDragData>(this, {
    shouldDrag: [
      '.tool-window-titlebar',
      '.tool-window-resize'
    ],
    userData: {
      dragPX: 0,
      dragPY: 0,
      dragSX: 0,
      dragSY: 0,
      dragType: ''
    }
  });

  constructor(props: ToolWindowProps<T>) {
    super(props);
    this.px = props.defaultLeft || 0;
    this.py = props.defaultTop || 0;
    this.sx = props.defaultWidth || 128;
    this.sy = props.defaultHeight || 128;
    if (props.title)
      this.title = props.title;
    this.changed = true;
  }
  
  componentDidMount(): void {
    this.dragDispatcher.hook();
  }

  componentWillUnmount(): void {    
    this.dragDispatcher.unhook();
  }

  shouldComponentUpdate(): boolean {
    return this.changed;
  }

  render(): JSX.Element {
    this.changed = false;
    return <div className="tool-window-frame"
        style={{
          position: 'absolute',
          left: this.px + 'px',
          top: this.py + 'px',
          width: this.sx + 'px',
          height: this.sy + 'px',
          outline: 'outset #789 2px',
          borderRadius: '2px'
        }}>
      {/* top edge */}
      <div className="tool-window-resize"
        data-resize="t"
        ref={(el) => this.resizingElements[SizingElement.TOP] = el}
        style={{
          position: 'absolute',
          left: (this.handleHalfSize) + 'px',
          top: (-this.handleHalfSize) + 'px',
          width: (this.sx - this.handleHalfSize * 2) + 'px',
          height: (this.handleHalfSize * 2) + 'px',
          cursor: 'ns-resize',
          //outline: 'solid red 1px',
          color: 'rgba(0,0,0,0)'
        }}
        />
      {/* left edge */}
      <div className="tool-window-resize"
        data-resize="l"
        ref={(el) => this.resizingElements[SizingElement.LEFT] = el}
        style={{
          position: 'absolute',
          left: (-this.handleHalfSize) + 'px',
          top: (this.handleHalfSize) + 'px',
          width: (this.handleHalfSize * 2) + 'px',
          height: (this.sy - this.handleHalfSize * 2) + 'px',
          cursor: 'ew-resize',
          //outline: 'solid red 1px',
          color: 'rgba(0,0,0,0)'
        }}
        />
      {/* bottom edge */}
      <div className="tool-window-resize"
        data-resize="b"
        ref={(el) => this.resizingElements[SizingElement.BOTTOM] = el}
        style={{
          position: 'absolute',
          left: (this.handleHalfSize) + 'px',
          top: (this.sy - this.handleHalfSize) + 'px',
          width: (this.sx - this.handleHalfSize * 2) + 'px',
          height: (this.handleHalfSize * 2) + 'px',
          cursor: 'ns-resize',
          //outline: 'solid red 1px',
          color: 'rgba(0,0,0,0)'
        }}
        />
      {/* right edge */}
      <div className="tool-window-resize"
        data-resize="r"
        ref={(el) => this.resizingElements[SizingElement.RIGHT] = el}
        style={{
          position: 'absolute',
          left: (this.sx - this.handleHalfSize) + 'px',
          top: (this.handleHalfSize) + 'px',
          width: (this.handleHalfSize * 2) + 'px',
          height: (this.sy - this.handleHalfSize * 2) + 'px',
          cursor: 'ew-resize',
          //outline: 'solid red 1px',
          color: 'rgba(0,0,0,0)'
        }}
        />
      {/* top left corner */}
      <div className="tool-window-resize"
        data-resize="tl"
        ref={(el) => this.resizingElements[SizingElement.TOPLEFT] = el}
        style={{
          position: 'absolute',
          left: (-this.handleHalfSize) + 'px',
          top: (-this.handleHalfSize) + 'px',
          width: (this.handleHalfSize * 2) + 'px',
          height: (this.handleHalfSize * 2) + 'px',
          cursor: 'nwse-resize',
          //outline: 'solid red 1px',
          color: 'rgba(0,0,0,0)'
        }}
        />
      {/* bottom left corner */}
      <div className="tool-window-resize"
        data-resize="bl"
        ref={(el) => this.resizingElements[SizingElement.BOTTOMLEFT] = el}
        style={{
          position: 'absolute',
          left: (-this.handleHalfSize) + 'px',
          top: (this.sy - this.handleHalfSize) + 'px',
          width: (this.handleHalfSize * 2) + 'px',
          height: ( this.handleHalfSize * 2) + 'px',
          cursor: 'nesw-resize',
          //outline: 'solid red 1px',
          color: 'rgba(0,0,0,0)'
        }}
        />
      {/* top right corner */}
      <div className="tool-window-resize"
        data-resize="tr"
        ref={(el) => this.resizingElements[SizingElement.TOPRIGHT] = el}
        style={{
          position: 'absolute',
          left: (this.sx - this.handleHalfSize) + 'px',
          top: (-this.handleHalfSize) + 'px',
          width: (this.handleHalfSize * 2) + 'px',
          height: (this.handleHalfSize * 2) + 'px',
          cursor: 'nesw-resize',
          //outline: 'solid red 1px',
          color: 'rgba(0,0,0,0)'
        }}
        />
      {/* bottom right corner */}
      <div className="tool-window-resize"
        data-resize="br"
        ref={(el) => this.resizingElements[SizingElement.BOTTOMRIGHT] = el}
        style={{
          position: 'absolute',
          left: (this.sx - this.handleHalfSize) + 'px',
          top: (this.sy - this.handleHalfSize) + 'px',
          width: (this.handleHalfSize * 2) + 'px',
          height: (this.handleHalfSize * 2) + 'px',
          cursor: 'nwse-resize',
          //outline: 'solid red 1px',
          color: 'rgba(0,0,0,0)'
        }}
        />
      <div className="tool-window-titlebar"
          ref={(el) => this.titleElement = el}
          style={{
            position: 'relative',
            top: '0',
            left: '0',
            width: this.sx + 'px',
            padding: '2px',
            height: this.titleHeight + 'px',
            overflow: 'clip',
            background: '#123456'
          }}>
        {this.title}
      </div>
      <div className="tool-window-client"
          ref={(el) => this.clientElement = el}
          style={{
            position: 'absolute',
            top: this.titleHeight + 'px',
            left: '0px',
            width: this.sx + 'px',
            height: (this.sy - this.titleHeight) + 'px',
            background: 'rgba(0,0,0,0.5)'
          }}>
        {this.createGuest()}
      </div>
    </div>
  }

  createGuest() {
    return React.Children.map(this.props.children, (child, index) => {
      if (React.isValidElement<ResizableChild>(child)) {
        let childElement: React.ReactElement<
          ResizableChild & ClassAttributes<ResizableChild>> = child;
        let childElement2 = React.cloneElement(childElement, {
          ref: (el: T) => this.acceptChildRef(el, index)
        });
        return childElement2;
      } else {
        console.log('dropped child');
        return null;
      }
    });
  }

  acceptChildRef(child: T | null, index: number): void {
    this.resizableChildren[index] = child;
    if (this.props.childRef)
      this.props.childRef(child);
    if (child)
      child.resize(this.sx, this.sy - this.titleHeight)
  }

  // private dragging: boolean = false;
  // private resizing: boolean = false;
  // private dragX: number = 0;
  // private dragY: number = 0;
  // private dragPX: number = 0;
  // private dragPY: number = 0;
  // private dragSX: number = 0;
  // private dragSY: number = 0;
  // private dragType: string | null = null;

  public handleDragStart(from: DragDispatcher<ToolWindowDragData>, 
      ev: Event): void {
    from.userData.dragType = 'move';
    from.userData.dragPX = this.px;
    from.userData.dragPY = this.py;
    from.userData.dragSX = this.sx;
    from.userData.dragSY = this.sy;
    
    if (from.dragType === '.tool-window-resize') {
      let el = ev.target as Element;
      let closestResize = el.closest('.tool-window-resize');
      let type = closestResize?.getAttribute('data-resize') || '';
      console.assert(type);
      from.userData.dragType = type;
    } else if (from.dragType === '.tool-window-titlebar') {
      from.userData.dragType = 'move';      
    }
    //console.log('drag start');
  }

  public handleDragEnd(from: DragDispatcher<ToolWindowDragData>, 
      ev: Event): void {
    from.userData.dragType = '';
    //console.log('drag end');
  }

  public handleDragMove(from: DragDispatcher<ToolWindowDragData>, 
      ev: Event): void {
    let dx = from.dragDX;
    let dy = from.dragDY;
    if (from.userData.dragType === 'move') {
      if (from.related !== this.titleElement)
        return;
      //console.log('dragging');
      this.px = from.userData.dragPX + dx;
      this.py = from.userData.dragPY + dy;
    } else {
      //console.log('resizing');
      if (this.resizingElements.includes(from.related))
      switch (from.userData.dragType) {
      case 't':
        this.py = from.userData.dragPY + dy;
        this.sy = from.userData.dragSY - dy;
        break;
      case 'l':
        this.px = from.userData.dragPX + dx;
        this.sx = from.userData.dragSX - dx;
        break;
      case 'b':
        this.sy = from.userData.dragSY + dy;
        break;
      case 'r':
        this.sx = from.userData.dragSX + dx;
        break;
      case 'tl':
        this.px = from.userData.dragPX + dx;
        this.py = from.userData.dragPY + dy;
        this.sx = from.userData.dragSX - dx;
        this.sy = from.userData.dragSY - dy;
        break;
      case 'bl':
        this.px = from.userData.dragPX + dx;
        this.sx = from.userData.dragSX - dx;
        this.sy = from.userData.dragSY + dy;
        break;
      case 'br':
        this.sx = from.userData.dragSX + dx;
        this.sy = from.userData.dragSY + dy;
        break;
      case 'tr':
        this.py = from.userData.dragPY + dy;
        this.sx = from.userData.dragSX + dx;
        this.sy = from.userData.dragSY - dy;
        break;
      }
      this.resizableChildren.forEach((child) => {
        if (child)
          child.resize(this.sx, this.sy - this.titleHeight);
      })
    }
    ev.preventDefault();
    this.changed = true;
    if (!this.autoClamp())
      this.setState({});
  }
  
  resize(width: number, height: number): void {
    if (this.clientElement) {
      this.clientElement.style.width = width + 'px';

      if (this.titleElement) {
        this.clientElement.style.height = (height - 
            this.titleElement.offsetHeight) + 'px';
      } else {
        this.clientElement.style.height = height + 'px';
      }

      this.resizableChildren.forEach((child) => {
        if (child)
          child.resize(width, height - 32);
      });
    }

    if (this.titleElement)
      this.titleElement.style.width = width + 'px';
  }

  autoClamp(): boolean {
    return this.canAutoClamp &&
        this.clampWithin(this.clampLeft, this.clampTop,
          this.clampRight, this.clampBottom);
  }

  clampWithin(left: number, top: number, 
      right: number, bottom: number): boolean {
    
    this.clampLeft = left;
    this.clampTop = top;
    this.clampRight = right;
    this.clampBottom = bottom;
    this.canAutoClamp = true;
    
    // Enforce outline visible
    ++left;
    ++top;
    right -= 1;
    bottom -= 1;
    
    let didSomething = false;
    let maxW = right - left;
    let maxH = bottom - top;
        
    // Now is our chance to meet size goals
    if (this.sx < this.minWidth) {
      this.sx = this.minWidth;
      didSomething = true;
    }
    
    // Now is our chance to meet size goals
    if (this.sy < this.minHeight) {
      this.sy = this.minHeight;
      didSomething = true;
    }

    // Force onto screen if off right side
    if (this.px + this.sx > right) {
      this.px = right - this.sx;
      didSomething = true;
    }
    
    // Force onto screen if off bottom side
    if (this.py + this.sy > bottom) {
      this.py = bottom - this.sy;
      didSomething = true;
    }

    // Force onto screen if off left side
    // and adjust size if it would overflow right
    if (this.px < left) {
      this.px = left;
      if (this.sx > maxW)
        this.sx = maxW;
      didSomething = true;
    }
    
    // Force onto screen if off top side
    // and adjust size if it would overflow bottom
    if (this.py < top) {
      this.py = top;
      if (this.sy > maxH)
        this.sy = maxH;
      didSomething = true;
    }
    
    if (didSomething) {
      this.changed = true;
      this.setState({});
    }

    return didSomething;
  }
}

export interface ResizableChild {
  resize(width: number, height: number): void;
  clampWithin(left: number, top: number,
      right: number, bottom: number): boolean;
}
