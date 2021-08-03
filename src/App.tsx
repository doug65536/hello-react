import logo from './logo.svg';
import './App.css';
import React from 'react';
import { FrameGraph } from './FrameGraph';
import { Obstacle, RigidBody, RoundBody } from './RigidBody';
import { ToolWindow } from './ToolWindow';

class App extends React.Component<{}> {
  private obstacleElements: Array<JSX.Element | null> = [];
  private bodyElements: Array<JSX.Element | null> = [];
  private obstacles: Array<Obstacle | null> = [];
  private bodies: Array<RigidBody | null> = [];
  private lastTime: number = NaN;
  private frameGraph: FrameGraph | null = null;
  private targetCount: number = 10;
  private fpsDigitalDisplay: HTMLDivElement | null = null;
  private fpsDigitalDisplayInterval: NodeJS.Timer | null = null;
  private windowResizeHandlerBound: (() => void) | null = null;
  public toolWindow: ToolWindow<FrameGraph> | null = null;

  public constructor(props: {}) {
    super(props);
    this.generateObstacles();
    this.generateBodies();
  }

  componentDidMount(): void {
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
    if (this.toolWindow)
      this.toolWindow.clampWithin(0, 0, 
          window.innerWidth, window.innerHeight);
  }

  componentWillUnmount(): void {
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
    let contacts = [false, false, false, false];
    const stepSize = 0.006;

    const collisionTop = 0;
    const collisionLeft = 0;
    const collisionBottom = window.innerHeight;
    const collisionRight = window.innerWidth;
    
    for (let i = 0, e = this.bodies.length; i < e; ++i) {    
      let body = this.bodies[i];
      if (!body)
        continue;
      // let remain = elap;
      // let useMicrostep = false;
      // if (!useMicrostep || remain > 0.016) {
        body.step(elap);
        body.collide(collisionLeft, collisionTop, 
          collisionRight, 
          collisionBottom, contacts);
      // } else {
      //   while (remain >= 0.0005) {
      //     let thisStep = Math.min(remain, stepSize);
      //     remain -= stepSize;
      //     body.step(thisStep);
      //     body.collide(collisionLeft, collisionTop, 
      //       collisionRight, collisionBottom, contacts);
      //   }
      // }

      body.update();
    }

    if (this.frameGraph)
      this.frameGraph.update();
    
    if (this.bodyElements.length === this.targetCount + 1) {
      this.bodyElements.pop();
      this.bodies.pop();
    } else if (this.bodyElements.length > this.targetCount) {
      this.bodyElements.splice(this.targetCount);
      this.bodies.splice(this.targetCount);
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
    this.bodies[i] = body;

    if (body) {
      body.randomizeVelocity();
      body.randomizePosition();
      this.setState({});
      //body.randomizeAcceleration();
    }
  }

  private createBody(i: number): JSX.Element {
    return <RoundBody 
      key={i} 
      ref={(comp) => this.initComponent(i, comp)}
      />;
  }

  private generateBodies() {
    this.bodies.splice(0, this.bodies.length);

    for (let i = 0; i < 10; ++i)
      this.bodyElements[i] = this.createBody(i);
  }

  public render(): JSX.Element {
    return <>
      <input
        type="number"
        min="0"
        defaultValue={this.targetCount}
        onChange={(rev) => this.targetCount = +rev.target.value}
        style={{
          position: 'absolute',
          left: '48px'
        }}/>
        <div
          style={{color: 'white'}}
          ref={(el) => this.fpsDigitalDisplay = el}/>

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
          defaultLeft={100}
          defaultTop={100}
          defaultWidth={640}
          defaultHeight={480}
          minWidth={256}
          minHeight={128}
          ref={(comp) => this.attachToolWindow(comp)}
          childRef={(comp) => this.attachFrameGraph(comp)}>
        <FrameGraph />
      </ToolWindow>
    </>;
  }

  attachToolWindow(toolWindow: ToolWindow<FrameGraph> | null): void {
    this.toolWindow = toolWindow;    
    this.windowResizeHandler();
  }

  attachFrameGraph(frameGraph: FrameGraph | null): void {
    this.frameGraph = frameGraph;
  }
}


export default App;

