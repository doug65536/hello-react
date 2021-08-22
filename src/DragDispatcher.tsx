import { MouseDispatcher, MouseDispatcherListener } from "./MouseDispatcher";

export interface DragDispatcherConfig<TUserData> {
  shouldDrag?: ((el: Element) => string | null) | string[];
  userData?: TUserData
}

export interface DragDispatcherListener<TUserData> {
  handleDragStart(from: DragDispatcher<TUserData>, ev: Event): void;
  handleDragMove(from: DragDispatcher<TUserData>, ev: Event): void;
  handleDragEnd(from: DragDispatcher<TUserData>, ev: Event): void;
}

export class DragDispatcher<TUserData>
  implements MouseDispatcherListener {
  private mouseDispatcher = new MouseDispatcher(this, true);
  private dragging: boolean = false;
  public userData: TUserData;
  public related: Element | null = null;
  // Instantaneous drag position
  public dragX: number = 0;
  public dragY: number = 0;
  // Start drag position
  public dragSX: number = 0;
  public dragSY: number = 0;
  public dragDX: number = 0;
  public dragDY: number = 0;
  public dragType: string | null = null;

  private dragFilter: ((el: Element) => string | null) | null = null;

  constructor(private target: DragDispatcherListener<TUserData>,
    config?: DragDispatcherConfig<TUserData>) {
    if (!config || !config.shouldDrag) {
      this.dragFilter = (el: Element) => '';
      this.userData = {} as TUserData;
    } else {
      this.userData = config.userData || {} as TUserData;

      if (config.shouldDrag instanceof Function) {
        this.dragFilter = config.shouldDrag;
      } else {
        this.dragFilter = (el: Element) => {
          let selectors = config.shouldDrag as string[];
          this.related = null;
          for (let i = 0; i < selectors.length; ++i) {
            let selector = selectors[i];
            let match = el.closest(selector);
            if (match) {
              this.related = match;
              return selector;
            }
          }
          return null;
        };
      }
    }
  }

  hook(): void {
    this.mouseDispatcher.hook();
  }

  unhook(): void {
    this.mouseDispatcher.unhook();
  }

  handleInputMove(clientX: number, clientY: number, ev: Event): void {
    if (!this.dragging)
      return;

    this.dragX = clientX;
    this.dragY = clientY;
    this.dragDX = clientX - this.dragSX;
    this.dragDY = clientY - this.dragSY;

    this.target?.handleDragMove(this, ev);
  }

  handleInputUp(clientX: number, clientY: number, ev: Event): void {
    if (!this.dragging)
      return;

    this.dragX = clientX;
    this.dragY = clientY;
    this.dragDX = clientX - this.dragSX;
    this.dragDY = clientY - this.dragSY;
    this.dragging = false;
  
    this.target?.handleDragEnd(this, ev);
  }

  handleInputDown(clientX: number, clientY: number, ev: Event): void {
    this.dragX = clientX;
    this.dragY = clientY;
    this.dragSX = clientX;
    this.dragSY = clientY;
    this.dragDX = 0;
    this.dragDY = 0;
    
    let type: string | null = '';
    if (this.dragFilter)
      type = this.dragFilter(ev.target as Element);
    
    if (type !== null) {
      this.dragging = true;  
      this.dragType = type;
      this.target?.handleDragStart(this, ev);
      ev.preventDefault();
    } else {
      // Should not happen, but just in case
      this.dragging = false;
    }
  }
}
