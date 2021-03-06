//import logo from './logo.svg';
import './App.css';
import React from 'react';
import { FrameGraph } from './FrameGraph';
import { Obstacle, RigidBody, RoundBody } from './RigidBody';
import { CollisionBuckets } from "./CollisionBuckets";
import { ToolWindow } from './ToolWindow';
import { DragDispatcher, DragDispatcherListener } from './DragDispatcher';
import { GLCanvas } from './GLCanvas';
import { SessionDashboard } from './Session';

// = relativistic momentum =
//             mv
//  p = -----------------
//      sqrt(1 - (v/c)^2)
// 
// = length contraction ====
//
// L = L0 * sqrt(1 - (v^2/c^2))
//

interface AppDragData {
  body: RigidBody | null;
  dragType: string;
}

class App extends React.Component<{}> 
    implements DragDispatcherListener<AppDragData> {
  private obstacleElements: Array<JSX.Element | null> = [];
  private bodyElements: Array<JSX.Element | null> = [];
  private obstacles: Array<Obstacle | null> = [];
  private bodies: Array<RigidBody | null> = [];
  private lastTime: number = NaN;
  private frameGraph: FrameGraph | null = null;
  private targetCount: number = 6;
  private fpsDigitalDisplay: HTMLDivElement | null = null;
  private fpsDigitalDisplayInterval: NodeJS.Timer | null = null;
  private windowResizeHandlerBound: (() => void) | null = null;
  public graphWindow: ToolWindow<FrameGraph> | null = null;
  public planetWindow: ToolWindow<GLCanvas> | null = null;
  private sessionWindow: ToolWindow<SessionDashboard> | null = null;
  private buckets: CollisionBuckets = new CollisionBuckets();
  private paused: boolean = false;
  private slow: boolean = false;
  private dragDispatcher = new DragDispatcher<AppDragData>(this, {
    shouldDrag: ['.body'],
    userData: {
      body: null,
      dragType: ''
    }
  });

  public constructor(props: {}) {
    super(props);
    this.generateObstacles();
    this.generateBodies();
  }

  private draggedBody: RigidBody | null = null;
  private draggedX: number = 0;
  private draggedY: number = 0;

  handleDragStart(from: DragDispatcher<AppDragData>, ev: Event): void {
    //console.log('body drag start');
    from.userData.dragType = '';
    let el = ev.target! as HTMLElement;
    if (el && el.dataset && el.dataset.bodyid !== undefined) {
      let id = +el.dataset.bodyid;
      let body = this.bodies.find((body) => {
        if (body)
          return body.id === id;
        return false;
      });
      if (body) {
        body.frozen = true;
        from.userData.body = body;
        from.userData.dragType = 'body';
        this.draggedBody = body;
        this.draggedX = from.dragX;
        this.draggedY = from.dragY;
      }
    }
  }

  handleDragMove(from: DragDispatcher<AppDragData>, ev: Event): void {
    //console.log('body drag move');
    if (from.userData.dragType !== 'body')
      return;
    //let body = from.userData.body;
    if (this.draggedBody) {
      this.draggedX = from.dragX;
      this.draggedY = from.dragY;
    }
  }

  handleDragEnd(from: DragDispatcher<AppDragData>, ev: Event): void {
    //console.log('body drag end');
    if (from.userData.dragType !== 'body')
      return;
    this.draggedBody!.frozen = false;
    this.draggedBody = null;
    //if (from.userData.body)
      //from.userData.body.frozen = false;
    from.userData.dragType = '';
  }

  componentDidMount(): void {
    this.dragDispatcher.hook();

    this.anotherFrame();

    this.fpsDigitalDisplayInterval = setInterval(() => {
      if (this.fpsDigitalDisplay && this.frameGraph)
        this.fpsDigitalDisplay.innerText = 
            (this.frameGraph.fps || 0).toFixed(3);
    }, 1000);

    this.windowResizeHandlerBound = this.windowResizeHandler.bind(this);

    window.addEventListener('resize', this.windowResizeHandlerBound);
  }

  private windowResizeHandler(): void {
    [this.graphWindow, this.planetWindow, this.sessionWindow].forEach((win) => {
      if (win)
        win.clampWithin(0, 0, window.innerWidth, window.innerHeight);
    });
  }

  componentWillUnmount(): void {
    this.dragDispatcher.unhook();
    if (this.windowResizeHandlerBound)
      window.removeEventListener('resize', this.windowResizeHandlerBound);
    this.windowResizeHandlerBound = null;

    if (this.fpsDigitalDisplayInterval)
      clearInterval(this.fpsDigitalDisplayInterval);
    this.fpsDigitalDisplayInterval = null;
  }
  
  private anotherFrame(): void {
    var callback = () => {
      let now = performance.now();
      let elap = (now - this.lastTime) / 1000;
      this.lastTime = now;

      // Clamp time warps (start slowing motion at 10fps)
      elap = Math.min(0.1, elap);
      
      if (!Number.isNaN(elap)) {
        this.advanceTime(elap);
      
        requestAnimationFrame(callback);
      } else {
        requestAnimationFrame(callback);
      }
    };
    requestAnimationFrame(callback);
  }

  private advanceTime(elap: number) {
    if (this.paused || !this.bodies)
      return;

    const stepSize = 0.004;

    const collisionTop = 0;
    const collisionLeft = 0;
    const collisionBottom = window.innerHeight;
    const collisionRight = window.innerWidth;

    this.buckets.newFrame();

    //this.buckets.validate(this.bodies);

    let remain = !this.slow ? elap : elap * 0.05; //0.125;
    let useMicrostep = true;
    if (!useMicrostep /*|| remain > 0.02*/) {
      // for (let i = 0, e = this.bodies.length; i < e; ++i) {    
      //   let body = this.bodies[i];
      //   if (!body)
      //     continue;

      //   // Initialize drag
      //   // let speedSq = body.vx * body.vx + body.vy * body.vy;
      //   // if (speedSq > 4000 * 4000) {
      //   //   let drag = -0.5;
      //   //   body.ax += body.vx * drag;
      //   //   body.ay += body.vy * drag;
      //   // }

      
      //   body.ax = 0;
      //   body.ay = body.onFloor ? 0 : 980;
        
      //   body.step(elap, this.buckets);
      //   body.collide(collisionLeft, collisionTop, 
      //     collisionRight, collisionBottom, this.buckets);
      //   body.update();
    } else {
      while (remain >= 0.0005) {
        let thisStep = Math.min(remain, stepSize);
        remain -= stepSize;

        // Clear the acceleration
        // for (let i = 0, e = this.bodies.length; i < e; ++i) {
        //   let body = this.bodies[i];
        //   if (body) {
        //     body.ax = 0;
        //     body.ay = 0;
        //   }
        // }

        // 

        for (let i = 0, e = this.bodies.length; i < e; ++i) {
          let body = this.bodies[i];
          if (body) {
            body.ax = 0;
            body.ay = 980;
            if (body.hx !== 0 || body.hy !== 0 || body.wtf) {
              body.hy -= 1;
              let hm = body.wtf / Math.sqrt(
                body.hx * body.hx + body.hy * body.hy);
              body.hx *= hm;
              body.hy *= hm;
              body.px += body.hx;
              body.py += body.hy;
              body.hx = 0;
              body.hy = 0;
              body.wtf = 0;
              this.buckets.moveBody(body, body.px, body.py);
            }
            if (body.frozen) {
              let dx = this.draggedX - body.px;
              let dy = this.draggedY - body.py;
              let dist = Math.sqrt(dx * dx + dy * dy);
              let invDist = 1 / dist;
              let force = dist * 4000 / body.mass;
              dx *= invDist;
              dy *= invDist;
              dx *= force;
              dy *= force;
              body.ax += dx;
              body.ay += dy;
              body.vx *= 0.99;
              body.vy *= 0.99;
            }

            body.step(thisStep, this.buckets);
          }
        }
        for (let i = 0, e = this.bodies.length; i < e; ++i) {
          let body = this.bodies[i];
          if (body) {
            body.collide(collisionLeft, collisionTop, 
              collisionRight, collisionBottom, this.buckets);
            body.update();
          }
        }
      }
    }
    

    if (this.frameGraph)
      this.frameGraph.update();
    
    if (this.bodyElements.length === this.targetCount + 1) {
      this.bodyElements.pop();
      let lastBody = this.bodies.pop();
      if (lastBody)
        this.buckets.removeBody(lastBody);
    } else if (this.bodyElements.length > this.targetCount) {
      // fling the elements
      this.bodyElements.splice(this.targetCount);
      while (this.bodies.length && this.bodies.length > this.targetCount) {
        let body = this.bodies.pop();
        if (body)
          this.buckets.removeBody(body);
      }
    } else if (this.bodyElements.length < this.targetCount) {
      for (let i = 0, e = this.targetCount - this.bodyElements.length; 
          i < e; ++i) {
        let newBody = this.createBody(this.bodyElements.length);
        this.bodyElements.push(newBody);
      }
    } else {
      return;
    }
    this.setState({});
  }
  
  private generateObstacles(): void {
    // this.obstacles.splice(0, this.obstacles.length);
    
    // for (let row = 0; row < 16; ++row) {

    // }
  }

  private initComponent(i: number, body: RoundBody | null): void {
    let oldBody = this.bodies[i];

    // Don't create an entry if nulling already-removed one
    if (body || this.bodies[i])
      this.bodies[i] = body;

    if (body) {
      body.randomizeVelocity();
      body.randomizePosition(null);
      body.update();
      this.buckets.insertBody(body);
      //body.randomizeAcceleration();
    } else if (oldBody) {
      this.buckets.removeBody(oldBody);
    }
  }

  private createBody(i: number): JSX.Element {
    return <RoundBody 
      key={i}
      data-index={i} 
      ref={(comp) => this.initComponent(i, comp)}
      />;
  }

  private generateBodies() {
    this.bodies.splice(0, this.bodies.length).forEach((body) => {
      if (body)
        this.buckets.removeBody(body);
    });

    for (let i = 0; i < this.targetCount; ++i)
      this.bodyElements[i] = this.createBody(i);
  }

  public render(): JSX.Element {
    let enableCollisionGrid: boolean = true;
    return <>
      <div style={{position: 'absolute'}}>
        {this.collisionGrid(enableCollisionGrid)}
      </div>
      <div style={{position: 'absolute'}}>
      <label>
        <input
          type="checkbox"
          key="pause-input"
          defaultChecked={this.paused}
          onChange={() => this.paused = !this.paused}
          />
        Pause
      </label> |
      <label>
        <input
          type="checkbox"
          key="slow-input"
          defaultChecked={this.slow}
          onChange={() => this.slow = !this.slow}
          />
        Slow
      </label>
      <input
        type="number"
        key="ball-count-input"
        min="0" max="100"
        defaultValue={this.targetCount}
        onChange={(rev) => this.targetCount = +rev.target.value}
        style={{
          position: 'absolute',
          float: 'right',
          marginLeft: '12'
        }}/>
      <div 
        style={{color: 'white'}}
        ref={(el) => this.fpsDigitalDisplay = el}/>
      </div>

      <div style={{
            left: 0,
            top: 0,
            right: 0,
            bottom: 0,
            overflow: 'hidden'
          }}>        
        {this.bodyElements}
      </div>
      
      <ToolWindow<FrameGraph>
          title="Frame Time Graph"
          defaultLeft={1257}
          defaultTop={35}
          defaultWidth={640}
          defaultHeight={400}
          minWidth={256}
          minHeight={128}
          ref={(comp) => this.attachGraphWindow(comp)}
          childRef={(comp) => this.attachFrameGraph(comp)}>
        <FrameGraph />
      </ToolWindow>

      <ToolWindow<GLCanvas>
        title="Earth"
        defaultLeft={100}
        defaultTop={100}
        defaultWidth={720}
        defaultHeight={480}
        ref={(comp) => this.attachPlanetWindow(comp)}>
        <GLCanvas />
      </ToolWindow>

      <ToolWindow<SessionDashboard>
        title="Work"
        defaultLeft={200}
        defaultTop={200}
        defaultWidth={720}
        defaultHeight={280}
        ref={(comp) => this.attachSessionWindow(comp)}>
        <SessionDashboard />
      </ToolWindow>

    </>;
  }

  collisionGrid(enable: boolean): JSX.Element {
    if (!enable)
      return <></>;
    let elements: JSX.Element[] = [];
    let gridW = 3840;
    let gridH = 2160;
    for (let r = 0; r < gridW; r += 128) {
      for (let c = 0; c < gridH; c += 128) {
        let box = <div
            key={r + '_' + c}
            style={{
              zIndex: -100,
              position: 'absolute',
              left: c + 'px',
              top: r + 'px',
              width: '128px',
              height: '128px',
              boxSizing: 'border-box',
              borderRight: 'solid black 1px',
              borderBottom: 'solid black 1px'
            }}/>;
        elements.push(box);
      }
    }
    // elements.push(<div style={{
    //     position: 'absolute',
    //     zIndex: -100,
    //     left: '0',
    //     top: '0',
    //     width: gridW + 'px',
    //     height: gridH + 'px'
    //   }}/>);
    return <>{elements}</>;
  }

  attachGraphWindow(tool: ToolWindow<FrameGraph> | null): void {
    this.graphWindow = tool;    
    this.windowResizeHandler();
  }

  attachSessionWindow(sessionWindow: ToolWindow<SessionDashboard> | null): void {
    this.sessionWindow = sessionWindow;
  }

  attachPlanetWindow(planetWindow: ToolWindow<GLCanvas> | null): void {
    this.planetWindow = planetWindow;
  }

  attachFrameGraph(frameGraph: FrameGraph | null): void {
    this.frameGraph = frameGraph;
  }
}


export default App;

