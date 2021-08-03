import React from "react";

export class Obstacle extends React.Component<{}> {
  public sx: number = 0;
  public sy: number = 0;
  public ex: number = 0;
  public ey: number = 0;
}

export interface RigidBodyProps {
  px?: number;
  py?: number;
  vx?: number;
  vy?: number;
}

export abstract class RigidBody<P extends RigidBodyProps = RigidBodyProps> 
    extends React.Component<P> {
  public px: number = 0;
  public py: number = 0;
  public vx: number = 0;
  public vy: number = 0;
  public ax: number = 0;
  public ay: number = 980;

  constructor(props: P) {
    super(props);
  }

  update() {
    this.setState({});
  }

  step(time: number): void {
    this.px += this.vx * time + 0.5 * this.ax * time * time;
    this.py += this.vy * time + 0.5 * this.ay * time * time;
    
    this.vx += this.ax * time;
    this.vy += this.ay * time;
  }

  randomizeVelocity(): void {
    let scale = 550;
    this.vx = scale * (Math.random() - 0.5);
    this.vy = 0;
  }

  randomizePosition(): void {
    this.px = Math.random() * 640;
    this.py = Math.random() * 480;
  }

  randomizeAcceleration(): void {
    let scale = 250;
    this.ax = (Math.random() - 0.5) * scale;
    this.ay = (Math.random() - 0.5) * scale;
    let magSq = this.ax * this.ax + this.ay * this.ay;
    let mag = Math.sqrt(magSq);
    let invMag = 900.8/mag;
    this.ax = this.ax * invMag;
    this.ay = this.ay * invMag;
  }

  abstract render(): JSX.Element;

  abstract collide(left: number, top: number, 
      right: number, bottom: number, contacts: boolean[]): void;
}

export interface RoundBodyProps extends RigidBodyProps {
  radius?: number;
}

export class RoundBody<P extends RoundBodyProps = RoundBodyProps> 
    extends RigidBody<P> {
  public radius: number = 42;
  public color: string = 'gray';
  private bodyElement: HTMLDivElement | null = null;

  private get style(): any {
    return {
      position: 'fixed',
      left: this.px + 'px',
      top: this.py + 'px',
      borderRadius: '50%',
      width: this.radius + 'px',
      height: this.radius + 'px',
      background: this.color
    };
  }

  constructor(props: P) {
    super(props);
    this.color = this.randomColor();
    this.radius = props.radius || 16 + Math.random() * 64;
  }

  private randomColor(): string {
    let r = Math.floor(16 + Math.random() * 192);
    let g = Math.floor(16 + Math.random() * 192);
    let b = Math.floor(16 + Math.random() * 192);
    return '#' + r.toString(16) + g.toString(16) + b.toString(16);
  }

  collide(left: number, top: number, right: number, bottom: number,
      contacts: boolean[]): void {
    // Reverse direction if contacting or penetrating boundary 
    // and it is still getting worse
    let leftPen = Math.min(0, this.px - this.radius - left);
    let topPen = Math.min(0, this.py - this.radius - top);
    let rightPen = Math.max(0, this.px + this.radius - right);
    let bottomPen = Math.max(0, this.py + this.radius - bottom);

    if (this.vx < 0)
      rightPen = 0;
    
    if (this.vx > 0)
      leftPen = 0;

    if (this.vy < 0)
      bottomPen = 0;

    if (this.vy > 0)
      topPen = 0;
    
    contacts[0] = contacts[0] || topPen < 0;
    contacts[1] = contacts[1] || leftPen < 0;
    contacts[2] = contacts[2] || bottomPen > 0;
    contacts[3] = contacts[3] || rightPen > 0;
    
    this.px -= rightPen;
    this.px -= leftPen;
    this.py -= bottomPen;
    this.py -= topPen;

    if (leftPen || rightPen)
      this.vx *= -1;

    if (topPen || bottomPen)
      this.vy *= -1;
    
    if (topPen)
        this.vy *= 0.2;
  }

  update(): void {
    if (!this.bodyElement)
      return;
    this.bodyElement.style.left = this.px + 'px';
    this.bodyElement.style.top = this.py + 'px';
  }

  render(): JSX.Element {
    return <div
      ref={(el) => this.attachElement(el)}
      className="body" style={this.style}/>;
    //   <div style={{
    //     position: "absolute",
    //     left: '50%',
    //     top: '50%',
    //     transform: 'translate(-50%,-50%)',
    //     textAlign: "center",
    //     color: 'black'
    //   }}>        
    // </div>
  }

  attachElement(el: HTMLDivElement | null): void {
    this.bodyElement = el;
  }
}
