export interface MouseDispatcherListener {
  handleInputMove(clientX: number, clientY: number, ev: Event): void;
  handleInputUp(clientX: number, clientY: number, ev: Event): void;
  handleInputDown(clientX: number, clientY: number, ev: Event): void;
}

export class MouseDispatcher {
  private mouseDownHandler: (ev: MouseEvent) => void;
  private mouseUpHandler: (ev: MouseEvent) => void;
  private mouseMoveHandler: (ev: MouseEvent) => void;
  private touchStartHandler: (ev: TouchEvent) => void;
  private touchEndHandler: (ev: TouchEvent) => void;
  private touchMoveHandler: (ev: TouchEvent) => void;

  private lastTouchX: number = 0;
  private lastTouchY: number = 0;

  constructor(private target: MouseDispatcherListener, 
      private clampToWindow: boolean = true) {
    this.mouseDownHandler = this.handleMouseDown.bind(this);
    this.mouseUpHandler = this.handleMouseUp.bind(this);
    this.mouseMoveHandler = this.handleMouseMove.bind(this);
    this.touchStartHandler = this.handleTouchDown.bind(this);
    this.touchEndHandler = this.handleTouchEnd.bind(this);
    this.touchMoveHandler = this.handleTouchMove.bind(this);
  }

  hook(): void {
    window.addEventListener('mousedown', this.mouseDownHandler);
    window.addEventListener('mouseup', this.mouseUpHandler);
    window.addEventListener('mousemove', this.mouseMoveHandler);
    window.addEventListener('touchstart', this.touchStartHandler);
    window.addEventListener('touchmove', this.touchMoveHandler);
    window.addEventListener('touchend', this.touchEndHandler);
  }

  unhook(): void {
    window.removeEventListener('mousedown', this.mouseDownHandler);
    window.removeEventListener('mouseup', this.mouseUpHandler);
    window.removeEventListener('mousemove', this.mouseMoveHandler);
    window.removeEventListener('touchstart', this.touchStartHandler);
    window.removeEventListener('touchend', this.touchEndHandler);
    window.removeEventListener('touchmove', this.touchMoveHandler);
  }

  private optionallyClamp(value: number, limit: number): number {
    if (this.clampToWindow)
      return Math.max(0, Math.min(limit, value));
    return value;
  }

  private get limitX(): number {
    return window.innerWidth;
  }

  private get limitY(): number {
    return window.innerHeight;
  }

  private handleTouchDown(ev: TouchEvent): void {
    let firstTouch = ev.touches[0];
    this.lastTouchX = firstTouch.clientX;
    this.lastTouchY = firstTouch.clientY;
    this.target?.handleInputDown(
      this.optionallyClamp(firstTouch.clientX, this.limitX),
      this.optionallyClamp(firstTouch.clientY, this.limitY), ev);
  }

  private handleTouchMove(ev: TouchEvent): void {
    let firstTouch = ev.touches[0];
    this.lastTouchX = firstTouch.clientX;
    this.lastTouchY = firstTouch.clientY;
    this.target?.handleInputMove(
      this.optionallyClamp(firstTouch.clientX, this.limitX),
      this.optionallyClamp(firstTouch.clientY, this.limitY), ev);
  }

  private handleTouchEnd(ev: TouchEvent): void {
    this.target?.handleInputUp(
      this.optionallyClamp(this.lastTouchX, this.limitX),
      this.optionallyClamp(this.lastTouchY, this.limitY), ev);
  }

  private handleMouseDown(ev: MouseEvent): void {
    this.target?.handleInputDown(
      this.optionallyClamp(ev.clientX, this.limitX),
      this.optionallyClamp(ev.clientY, this.limitY), ev);
  }

  private handleMouseMove(ev: MouseEvent): void {
    this.target?.handleInputMove(
      this.optionallyClamp(ev.clientX, this.limitX),
      this.optionallyClamp(ev.clientY, this.limitY), ev);
  }

  private handleMouseUp(ev: MouseEvent): void {
    // Don't throw away the mouse coordinates of mouseup!
    this.target?.handleInputMove(
      this.optionallyClamp(ev.clientX, this.limitX),
      this.optionallyClamp(ev.clientY, this.limitY), ev);
    this.target?.handleInputUp(
      this.optionallyClamp(ev.clientX, this.limitX),
      this.optionallyClamp(ev.clientY, this.limitY), ev);
  }
}


