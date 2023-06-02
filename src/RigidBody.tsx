import React from "react";
import { CollisionBuckets } from "./CollisionBuckets";

export class Obstacle extends React.Component<{}> {
  public sx: number = 0;
  public sy: number = 0;
  public ex: number = 0;
  public ey: number = 0;
}

export type OptionalRigidBody = RigidBody | null;

export interface RigidBodyProps {
  px?: number;
  py?: number;
  vx?: number;
  vy?: number;
  radius?: number;
}

export abstract class RigidBody<P extends RigidBodyProps = RigidBodyProps> 
    extends React.Component<P> {
  private static lastId: number = 0;
  public id: number = ++RigidBody.lastId;
  public px: number = 0;
  public py: number = 0;
  public vx: number = 0;
  public vy: number = 0;
  public ax: number = 0;
  public ay: number = 980;
  public hx: number = 0;
  public hy: number = 0;
  public wtf: number = 0;
  public radius: number = 0;
  // Collision grid row and column where this body is currently inserted
  public cx: number = -1;
  public cy: number = -1;
  public onFloor: boolean = false;
  public mass: number = 0;
  public frozen: boolean = false;

  // constructor(props: P) {
  //   super(props);
  // }

  update(): void {
    this.setState({});
  }

  step(time: number, buckets: CollisionBuckets): void {
    let oldx = this.px;
    let oldy = this.py;

    if (this.onFloor && this.vy < 0)
      this.vy *= -1;

    // Motion due to velocity
    this.px += this.vx * time;
    this.py += this.vy * time;

    // Extra motion due to velocity ramping up from acceleration during step
    this.px += 0.5 * this.ax * time * time;
    this.py += 0.5 * this.ay * time * time;
    
    // Accumulate the velocity gained from acceleration
    this.vx += this.ax * time;
    this.vy += this.ay * time;

    if (oldx !== this.px || oldy !== this.py)
      buckets.moveBody(this, this.px, this.py);
  }

  randomizeVelocity(): void {
    let scale = 550;
    this.vx = scale * (Math.random() - 0.5);
    this.vy = 0;
  }

  randomizePosition(buckets: CollisionBuckets | null): void {
    this.px = 50 + Math.random() * window.innerWidth - 100;
    this.py = window.innerHeight - 500 + Math.random() * 400;
    if (buckets)
      buckets.moveBody(this, this.px, this.py);
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
      right: number, bottom: number,
      buckets: CollisionBuckets): void;
}

export interface RoundBodyProps extends RigidBodyProps {
}

export class RoundBody<P extends RoundBodyProps = RoundBodyProps> 
    extends RigidBody<P> {
  public color: string = 'gray';
  private bodyElement: HTMLDivElement | null = null;

  private get style(): any {
    return {
      position: 'fixed',
      left: this.px + 'px',
      top: this.py + 'px',
      borderRadius: '50%',
      width: (this.radius * 2) + 'px',
      height: (this.radius * 2) + 'px',
      background: this.color,
      transform: 'translate(-50%, -50%)'
    };
  }

  constructor(props: P) {
    super(props);
    this.color = this.randomColor();
    this.radius = props.radius || 8 + Math.random() * 64;
    let radiusCubed = this.radius * this.radius * this.radius;
    this.mass = (4/3) * Math.PI * radiusCubed / 10000;
  }

  private randomColor(): string {
    let r = Math.floor(16 + Math.random() * 192);
    let g = Math.floor(16 + Math.random() * 192);
    let b = Math.floor(16 + Math.random() * 192);
    return '#' + r.toString(16) + g.toString(16) + b.toString(16);
  }

  static lastMessage: number = 0;

  collide(left: number, top: number, 
      right: number, bottom: number,
      buckets: CollisionBuckets): void {
    // Reverse direction if contacting or penetrating boundary 
    // and it is still getting worse
    let leftPen = Math.min(0, this.px - this.radius - left);
    let topPen = Math.min(0, this.py - this.radius - top);
    let rightPen = Math.max(0, this.px + this.radius - right);
    let bottomPen = Math.max(0, this.py + this.radius - bottom);

    const restitution = 0.98;

    // let oldx = this.px;
    // let oldy = this.py;

    if (this.vx < 0)
      rightPen = 0;
    
    if (this.vx > 0)
      leftPen = 0;

    if (this.vy < 0)
      bottomPen = 0;

    if (this.vy > 0)
      topPen = 0;
    
    // this.px -= rightPen;
    // this.px -= leftPen;
    // this.py -= bottomPen;
    // this.py -= topPen;

    if (bottomPen && this.vy * this.vy < 30*30) {
      this.vy = 0;
      this.py = window.innerHeight - this.radius;
      buckets.moveBody(this, this.px, this.py);
      this.onFloor = true;
    } else {
      this.onFloor = false;
    }

    if (bottomPen || leftPen || rightPen || topPen) {
      if (bottomPen)
        this.hy -= 1;
      else if (topPen)
        this.hy += 1;
      
      if (leftPen)
        this.hx += 1;
      else if (rightPen)
        this.hx -= -1;

      if (leftPen || rightPen)
        this.vx *= -restitution;

      if (topPen || bottomPen)
        this.vy *= -restitution;
      
      if (topPen)
        this.vy *= restitution;
      
      ++this.hx;
    }

    // if (this.px !== oldx || this.py !== oldy)
    //   buckets.moveBody(this, this.px, this.py);

    let performanceSt = performance.now();
    let nearbyBuckets = buckets.bodiesNear(this.px, this.py, this.radius);
    let performanceEn = performance.now();
    buckets.nearbyMs += performanceEn - performanceSt;

    // console.log(nearby.length, 'nearby buckets');

    let others = [];

    performanceSt = performance.now();

    //let foundCollisions: [number,number,number][] = [];
    for (let b = 0; b < nearbyBuckets.length; ++b) {
      let bucket = nearbyBuckets[b];
      
      for (let i = 0; i < bucket.length; ++i) {
        let candidate = bucket[i];

        // Only check the AB vs BA pair where this is smaller mass
        if (candidate.mass < this.mass)
          continue;
        // Don't collide with yourself
        if (candidate === this)
          continue;
        let dx = candidate.px - this.px;
        let dy = candidate.py - this.py;
        let sqMin = candidate.radius + this.radius;
        sqMin *= sqMin;
        dx *= dx;
        dy *= dy;
        dx += dy;        
        if (dx < sqMin) {
          // radii overlap
          // only check shouldignore for pairs of equal mass
          if (this.mass !== candidate.mass ||
              !buckets.shouldIgnore(this, candidate))
            others.push(candidate);
        }
      }
    }

    performanceEn = performance.now();
    buckets.checkMs += performanceEn - performanceSt;

    // let touchL = this.px - this.radius < 0;
    // let touchR = this.px + this.radius >= window.innerWidth;
    // let touchT = this.py - this.radius < 0;
    // let touchB = this.py + this.radius >= window.innerHeight;

    performanceSt = performance.now();

    if (others.length) {      
      for (let i = 0; i < others.length; ++i) {
//        console.clear();

        let otherBody = others[i];

        // let dot = this.vx * otherBody.vx + this.vy * otherBody.vy;
        // if (dot > 0)
        //   continue;

        let normx = (otherBody.px - this.px);
        let normy = (otherBody.py - this.py);
        let distSq = normx * normx + normy * normy;
        // //console.log('distSq', distSq);
        let dist = Math.sqrt(distSq);
        // normx /= dist;
        // normy /= dist;
        let minDist = (this.radius + otherBody.radius) + 1;
        // let shovedx = otherBody.px + normx * -minDist;
        // let shovedy = otherBody.py + normy * -minDist;
        // if (this.px !== shovedx || this.py !== shovedy)
        //   buckets.moveBody(this, shovedx, shovedy);
        // this.px = shovedx;
        // this.py = shovedy;

        if (dist < minDist) {
          otherBody.hx += normx;
          otherBody.hy += normy;
          otherBody.wtf++;
          this.hx -= normx;
          this.hy -= normy;
          this.wtf++;
        }

        // if (dist < minDist * 0.75)
        //   continue;

        // let oldSpeed1 = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        // let oldSpeed2 = Math.sqrt(otherBody.vx * otherBody.vx + 
        //     otherBody.vy * otherBody.vy);
        // let oldMomentum1 = oldSpeed1 * this.mass;
        // let oldMomentum2 = oldSpeed2 * otherBody.mass;
        // let oldTotalMomentum = oldMomentum1 + oldMomentum2;

        // console.log('oldspeed1',oldSpeed1);
        // console.log('oldspeed2',oldSpeed2);
        // console.log('oldmomentum1',oldMomentum1);
        // console.log('oldmomentum2',oldMomentum2);
        // console.log('oldtotalmomentum',oldTotalMomentum);

        //
        //                twom2     dot(v1 - v2, x1 - x2)
        // newv1 = v1 - --------- * --------------------- * (x1 - x2)
        //              totalMass          distSq
        //
        //                twom1     dot(v2 - v1, x2 - x1)
        // newv2 = v2 - --------- * --------------------- * (x2 - x1)
        //              totalMass          distSq
        //

        let m1 = this.mass;
        let m2 = otherBody.mass;

        let twom1 = 2 * m1;
        let twom2 = 2 * m2;
        let totalMass = m1 + m2;
        let invTotalMass = 1 / totalMass;
        let twom1OverTotalMass = twom1 * invTotalMass;
        let twom2OverTotalMass = twom2 * invTotalMass;
        
        // vector p1 (position)
        let p1x = this.px;
        let p1y = this.py;

        // vector v1 (velocity)
        let v1x = this.vx;
        let v1y = this.vy;

        // vector p2 (position)
        let p2x = otherBody.px;
        let p2y = otherBody.py;

        // vector v2 (velocity)
        let v2x = otherBody.vx;
        let v2y = otherBody.vy;

        // velocity difference vector v1 - v2
        let v2v1x = v1x - v2x;
        let v2v1y = v1y - v2y;

        // velocity difference vector v2 - v1
        let v1v2x = -v2v1x;
        let v1v2y = -v2v1y;

        // position difference vector p1 - p2
        let p2p1x = p1x - p2x;
        let p2p1y = p1y - p2y;

        // position difference vector p2 - p1
        let p1p2x = -p2p1x;
        let p1p2y = -p2p1y;

        // let normvvlen = Math.sqrt(p1p2x * p1p2x + p1p2y * p1p2y);
        // let normv1v2x = v1v2x / normvvlen;
        // let normv1v2y = v1v2y / normvvlen;
        // let normv2v1x = -normv1v2x;
        // let normv2v1y = -normv1v2y;

        let invDistSq = 1 / distSq;

        let dotv2v1p2p1 = v2v1x * p2p1x + v2v1y * p2p1y;
        let dotv1v2p1p2 = v1v2x * p1p2x + v1v2y * p1p2y;

        let dotv2v1p2p1OverDistSq = dotv2v1p2p1 * invDistSq;
        let dotv1v2p1p2OverDistSq = dotv1v2p1p2 * invDistSq;
        
        let p2p1Scale = twom2OverTotalMass * dotv2v1p2p1OverDistSq;
        let p1p2Scale = twom1OverTotalMass * dotv1v2p1p2OverDistSq;

        let sub1x = p2p1Scale * p2p1x;
        let sub1y = p2p1Scale * p2p1y;
        let sub2x = p1p2Scale * p1p2x;
        let sub2y = p1p2Scale * p1p2y;

        let newv1x = v1x - sub1x;
        let newv1y = v1y - sub1y;

        let newv2x = v2x - sub2x;
        let newv2y = v2y - sub2y;

        console.assert(!Number.isNaN(newv1x));
        console.assert(!Number.isNaN(newv1y));
        console.assert(!Number.isNaN(newv2x));
        console.assert(!Number.isNaN(newv2y));
        console.assert(Number.isFinite(newv1x));
        console.assert(Number.isFinite(newv1y));
        console.assert(Number.isFinite(newv2x));
        console.assert(Number.isFinite(newv2y));
        
        this.vx = newv1x * restitution;
        this.vy = newv1y * restitution;
        otherBody.vx = newv2x * restitution;
        otherBody.vy = newv2y * restitution;

        // let newSpeed1 = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        // let newSpeed2 = Math.sqrt(otherBody.vx * otherBody.vx + 
        //     otherBody.vy * otherBody.vy);
        // let newMomentum1 = newSpeed1 * this.mass;
        // let newMomentum2 = newSpeed2 * otherBody.mass;
        // let newTotalMomentum = newMomentum1 + newMomentum2;
        // console.log('newspeed1',newSpeed1);
        // console.log('newspeed2',newSpeed2);
        // console.log('newmomentum1',newMomentum1);
        // console.log('newmomentum2',newMomentum2);
        // console.log('newtotalmomentum',newTotalMomentum);

        // let momentumError = newTotalMomentum - oldTotalMomentum;
        // let momentumErrorPercent = 100 * momentumError / newTotalMomentum;
        // console.log('momentum error (absolute,%):', [
        //     momentumError, momentumErrorPercent]);
        //console.assert(Math.abs(momentumError) < 1);

        let explosionPoint: number = 3700;
        let explosionPointSq: number = explosionPoint * explosionPoint;
        let speed: number = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        let otherSpeed: number = Math.sqrt(otherBody.vx * otherBody.vx + 
            otherBody.vy * otherBody.vy);
        let exploding: boolean = this.vx * this.vx + 
            this.vy * this.vy > explosionPointSq ||
            otherBody.vx * otherBody.vx + 
            otherBody.vy * otherBody.vy > explosionPointSq;
        //console.assert(!exploding, 'speeds: ' + [speed, otherSpeed]);

        if (exploding)
          console.log('exploding, speeds: ' + [speed, otherSpeed]);

        if (this.mass === otherBody.mass) {
          // If not able to pick one based on mass, don't do the 
          // collision where this is the other body
          buckets.insertIgnore(otherBody, this);
        }
      }
    }

    performanceEn = performance.now();
    buckets.responseMs += performanceEn - performanceSt;

    let newSample = performance.now();

    if (buckets.outsideSample) {
      let elap = newSample - buckets.outsideSample;
      buckets.outsideMs += elap;
      ++buckets.outsideCount;
    } else {
      buckets.outsideSample = newSample;
    }
  }

  public get speedSq(): number {
    return this.vx * this.vx + this.vy * this.vy;
  }

  public get speed(): number {
    return Math.sqrt(this.speedSq);
  }

  public get momentum(): number {
    return this.speed * this.mass;
  }

  update(): void {
    if (!this.bodyElement)
      return;
    this.bodyElement.style.left = this.px + 'px';
    this.bodyElement.style.top = this.py + 'px';
    //this.bodyElement.innerText = this.speed.toFixed(1);
    // this.bodyElement.style.outline = this.onFloor 
    //   ? 'solid purple 1px'
    //   : '';
  }

  render(): JSX.Element {
    return <div
      ref={(el) => this.attachElement(el)}
      data-bodyid={this.id}
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
