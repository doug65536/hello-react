//import logo from './logo.svg';
import './App.css';
import React from 'react';
import { FrameGraph } from './FrameGraph';
import { Obstacle, RigidBody, RoundBody } from './RigidBody';
import { CollisionBuckets } from "./CollisionBuckets";
import { ToolWindow } from './ToolWindow';
import { DragDispatcher, DragDispatcherListener } from './DragDispatcher';
import { GLCanvasDemo } from './GLCanvasDemo';
import { SessionDashboard } from './Session';

// = relativistic momentum =
//             mv
//  p = -----------------
//      sqrt(1 - (v/c)²)
// 
// = length contraction ====
//
// L = L0 * sqrt(1 - (v²/c²))
//
// F = (1 + γ² v v^t) γ m a
//
//        1
// γ =  ——————
//      1 - v²
//
// a = (1 - v v^t) F
//     —————————————
//          γ m
//
// where v, a is a 3d vector in fraction of c, 1=speed of light
//
// 

//
// Fission theoretical max output: 1kg fuel = 8.8e+13 Joules of energy
// Fusion theoretical max output: 1kg fuel = 3.38e+14 Joules of energy
//
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
  private targetCount: number = 60;
  private microstepMicrosecs = 333;
  private fpsDigitalDisplay: HTMLDivElement | null = null;
  private fpsDigitalDisplayInterval: NodeJS.Timer | null = null;
  private windowResizeHandlerBound: (() => void) | null = null;
  public graphWindow: ToolWindow<FrameGraph> | null = null;
  public planetWindow: ToolWindow<GLCanvasDemo> | null = null;
  private sessionWindow: ToolWindow<SessionDashboard> | null = null;
  private buckets: CollisionBuckets = new CollisionBuckets();
  private paused: boolean = false;
  private slow: boolean = false;
  private ultra: boolean = false;
  private dragDispatcher = new DragDispatcher<AppDragData>(this, {
    shouldDrag: ['.body'],
    userData: {
      body: null,
      dragType: ''
    }
  });
  // Handles when we couldn't even do one microstep, 
  // accumulates partial microsteps
  private accumulatedRemainSec: number = 0;
  private performanceHackInterval: (NodeJS.Timer | null) = null;
  private gravity: number = 980;

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
        this.fpsDigitalDisplay.innerText = 'FPS: ' +
            (this.frameGraph.fps || 0).toFixed(3);
    }, 1000);

    this.windowResizeHandlerBound = this.windowResizeHandler.bind(this);

    window.addEventListener('resize', this.windowResizeHandlerBound);

    this.performanceHackInterval = setInterval(() => {
      console.log(this.buckets.perf);
    }, 1000);
  }

  private windowResizeHandler(): void {
    [this.graphWindow, this.planetWindow, this.sessionWindow].forEach((win) => {
      if (win)
        win.clampWithin(0, 0, window.innerWidth, window.innerHeight);
    });
  }

  componentWillUnmount(): void {
    if (this.performanceHackInterval) {
      clearInterval(this.performanceHackInterval);
      this.performanceHackInterval = null;
    }

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


  private advanceTime(elapSec: number) {
    if (this.paused || !this.bodies)
      return;


    const stepSize = this.microstepMicrosecs * 0.000001;

    const collisionTop = 0;
    const collisionLeft = 0;
    const collisionBottom = window.innerHeight;
    const collisionRight = window.innerWidth;

    this.buckets.newFrame();

    //this.buckets.validate(this.bodies);

    let remainSec = !this.slow ? elapSec : elapSec * 0.01; //0.125;
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
      remainSec += this.accumulatedRemainSec;
      this.accumulatedRemainSec = 0;
      while (remainSec >= stepSize) {
        let thisStep = Math.min(remainSec, stepSize);
        remainSec -= stepSize;

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
            body.ay = this.gravity;
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
              // body.vx *= 0.99;
              // body.vy *= 0.99;
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

      this.accumulatedRemainSec = remainSec;
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
    let boldIf = (c: boolean): React.CSSProperties => 
      c ? {fontWeight: 'bold'} : {};
    let qualityButton = (setting: number, label: string) =>
      <button 
      style={boldIf(this.microstepMicrosecs === setting)}
      onClick={(_) => { 
        this.microstepMicrosecs = setting;
        this.forceUpdate();
      }}>
      {label}
    </button>;
    
    let enableCollisionGrid: boolean = true;
    return <>
      <div style={{position: 'absolute'}}>
        {this.collisionGrid(enableCollisionGrid)}
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

      <div style={{position: 'absolute', left: 0, top: 0}}>
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
            type="number"
            key="gravity"
            min={-980*2}
            max={980*2}
            step={98}
            defaultValue={980}
            title="Gravity"
            onChange={(event) => {
              this.bodies.forEach((body) => {
                this.gravity = +event.target.value;
                if (body) 
                  body.ay = this.gravity;
              });
              this.forceUpdate();
            }}/> Gravity / 100
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
      <label style={{marginLeft:"12px"}}>
        Microsec per microstep
        <input
          type="number"
          key="quality-input"
          min={1}
          max={16666}
          value={this.microstepMicrosecs}
          title="1=Ludicrous quality, 16666=for very slow CPUs"
          onChange={(event) => {
            this.microstepMicrosecs = +event.target.value;
            this.forceUpdate();
          }}/>
      </label>
      {qualityButton(250, 'Ultra')}
      {qualityButton(333, 'High')}
      {qualityButton(500, 'Normal')}
      {qualityButton(16666, 'Ultralight')}
      <span style={{marginLeft: '12px'}}>        
        Ball count: <input
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
      </span>
      <div 
        style={{color: 'white'}}
        ref={(el) => this.fpsDigitalDisplay = el}/>
      </div>
      <div
        style={{
          position: 'absolute',
          right: 0,
          top: 0
        }}>
        Grab the balls with the mouse and throw them around!
        <button 
        onClick={(event) => ToolWindow.showAllWindows()}>
          Show All Popups
        </button>
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

      <ToolWindow<GLCanvasDemo>
        title="Earth"
        defaultLeft={100}
        defaultTop={100}
        defaultWidth={720}
        defaultHeight={480}
        ref={(comp) => this.attachPlanetWindow(comp)}>
        <GLCanvasDemo />
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

  attachPlanetWindow(planetWindow: ToolWindow<GLCanvasDemo> | null): void {
    this.planetWindow = planetWindow;
  }

  attachFrameGraph(frameGraph: FrameGraph | null): void {
    this.frameGraph = frameGraph;
  }
}


export default App;

