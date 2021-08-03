import React, { ClassAttributes } from "react";
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

export class ToolWindow<T extends ResizableChild> 
    extends React.Component<ToolWindowProps<T>>
    implements ResizableChild {
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
  private mouseDownHandler: (ev: MouseEvent) => void;
  private mouseUpHandler: (ev: MouseEvent) => void;
  private mouseMoveHandler: (ev: MouseEvent) => void;
  private touchStartHandler: (ev: TouchEvent) => void;
  private touchEndHandler: (ev: TouchEvent) => void;
  private touchMoveHandler: (ev: TouchEvent) => void;
  private resizableChildren: (T | null)[] = [];
  private handleHalfSize: number = 9;
  private changed: boolean = false;
  private clampLeft: number = 0;
  private clampTop: number = 0;
  private clampRight: number = window.innerWidth;
  private clampBottom: number = window.innerHeight;
  private canAutoClamp: boolean = false;

  constructor(props: ToolWindowProps<T>) {
    super(props);
    this.px = props.defaultLeft || 0;
    this.py = props.defaultTop || 0;
    this.sx = props.defaultWidth || 128;
    this.sy = props.defaultHeight || 128;
    if (props.title)
      this.title = props.title;
    this.changed = true;
    this.mouseDownHandler = this.handleMouseDown.bind(this);
    this.mouseUpHandler = this.handleMouseUp.bind(this);
    this.mouseMoveHandler = this.handleMouseMove.bind(this);
    this.touchStartHandler = this.handleTouchDown.bind(this);
    this.touchEndHandler =   this.handleTouchEnd.bind(this);
    this.touchMoveHandler = this.handleTouchMove.bind(this);
  }
  
  componentDidMount(): void {
    window.addEventListener('mousedown', this.mouseDownHandler);
    window.addEventListener('mouseup', this.mouseUpHandler);
    window.addEventListener('mousemove', this.mouseMoveHandler);
    window.addEventListener('touchstart', this.touchStartHandler);
    window.addEventListener('touchmove', this.touchMoveHandler);
    window.addEventListener('touchend', this.touchEndHandler);
  }

  componentWillUnmount(): void {    
    window.removeEventListener('mousedown', this.mouseDownHandler);
    window.removeEventListener('mouseup', this.mouseUpHandler);
    window.removeEventListener('mousemove', this.mouseMoveHandler);
    window.removeEventListener('touchstart', this.touchStartHandler);
    window.removeEventListener('touchend', this.touchEndHandler);
    window.removeEventListener('touchmove', this.touchMoveHandler);
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
            height: (this.sy - this.titleHeight) + 'px'
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

  private dragging: boolean = false;
  private resizing: boolean = false;
  private dragX: number = 0;
  private dragY: number = 0;
  private dragPX: number = 0;
  private dragPY: number = 0;
  private dragSX: number = 0;
  private dragSY: number = 0;
  private dragType: string | null = null;
  private lastTouchX: number = 0;
  private lastTouchY: number = 0;

  private handleTouchDown(ev: TouchEvent): void {
    let firstTouch = ev.touches[0];
    this.lastTouchX = firstTouch.clientX;
    this.lastTouchY = firstTouch.clientY;
    this.handleInputDown(firstTouch.clientX, firstTouch.clientY, ev);
  }
  
  private handleTouchMove(ev: TouchEvent): void {
    let firstTouch = ev.touches[0];
    this.lastTouchX = firstTouch.clientX;
    this.lastTouchY = firstTouch.clientY;
    this.handleInputMove(firstTouch.clientX, firstTouch.clientY, ev);
  }
  
  private handleTouchEnd(ev: TouchEvent): void {
    this.handleInputUp(this.lastTouchX, this.lastTouchY, ev);
  }
  
  private handleMouseDown(ev: MouseEvent): void {
    this.handleInputDown(ev.clientX, ev.clientY, ev);
  }
  
  private handleMouseUp(ev: MouseEvent): void {
    // Don't throw away the mouse coordinates of mouseup!
    this.handleInputMove(ev.clientX, ev.clientY, ev);
    this.handleInputUp(ev.clientX, ev.clientY, ev);
  }

  private handleInputDown(clientX: number, clientY: number, ev: Event) {
    let target = ev.target as HTMLElement;
    let dragType: string | null;
    let closestThing = target.closest('.tool-window-titlebar');
    if (closestThing) {
      this.dragging = true;
      dragType = null;
    } else {
      closestThing = target.closest('.tool-window-resize');
      if (!closestThing)
        return;
      this.resizing = true;
      dragType = closestThing.getAttribute('data-resize');
    }
    
    this.dragPX = this.px;
    this.dragPY = this.py;
    this.dragSX = this.sx;
    this.dragSY = this.sy;
    this.dragType = dragType;

    this.dragX = clientX;
    this.dragY = clientY;
    console.log('drag start');
    ev.preventDefault();
  }

  private handleInputUp(clientX: number, clientY: number, ev: Event): void {
    if (!this.dragging && !this.resizing)
      return;
    this.dragging = false;
    this.resizing = false;
    ev.preventDefault();
    console.log('drag end');
  }
  
  private handleMouseMove(ev: MouseEvent): void {
    this.handleInputMove(ev.clientX, ev.clientY, ev);
  }

  private handleInputMove(clientX: number, clientY: number, ev: Event): void {
    if (!this.dragging && !this.resizing)
      return;
    let dx = clientX - this.dragX;
    let dy = clientY - this.dragY;
    if (this.dragging) {
      //console.log('dragging');
      this.px = this.dragPX + dx;
      this.py = this.dragPY + dy;
    } else if (this.resizing) {
      //console.log('resizing');
      switch (this.dragType) {
      case 't':
        this.py = this.dragPY + dy;
        this.sy = this.dragSY - dy;
        break;
      case 'l':
        this.px = this.dragPX + dx;
        this.sx = this.dragSX - dx;
        break;
      case 'b':
        this.sy = this.dragSY + dy;
        break;
      case 'r':
        this.sx = this.dragSX + dx;
        break;
      case 'tl':
        this.px = this.dragPX + dx;
        this.py = this.dragPY + dy;
        this.sx = this.dragSX - dx;
        this.sy = this.dragSY - dy;
        break;
      case 'bl':
        this.px = this.dragPX + dx;
        this.sx = this.dragSX - dx;
        this.sy = this.dragSY + dy;
        break;
      case 'br':
        this.sx = this.dragSX + dx;
        this.sy = this.dragSY + dy;
        break;
      case 'tr':
        this.py = this.dragPY + dy;
        this.sx = this.dragSX + dx;
        this.sy = this.dragSY - dy;
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
