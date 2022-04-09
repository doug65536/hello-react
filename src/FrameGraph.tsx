import React from "react";
import { ResizableChild } from "./ToolWindow";

export class FrameGraph
    extends React.Component<{}>
    implements ResizableChild {
  private start = performance.now();
  private frameSamples: number[] = [];
  private canvasElement: HTMLCanvasElement | null = null;
  private sampleLimit: number = 64;
  private peak: number = 1;
  private peakTimer: number | null = null;
  private canvasWidth: number = 640;
  private canvasHeight: number = 480;
  public fps: number = 0;
  private leftMargin = 0;
  private targetPeak: number = 32;
  private ctx: CanvasRenderingContext2D | null = null;
  private needPeakUpdate: boolean = true;
  private instantaneousPeak: number = 1;
  private instantaneousFps: number = 0;

  shouldComponentUpdate(): boolean {
    return false;
  }

  update(): void {
    let now = performance.now();
    this.frameSamples.push(now);
    if (this.frameSamples.length === Math.round(this.sampleLimit) + 1)
      this.frameSamples.shift();
    else if (this.frameSamples.length > Math.round(this.sampleLimit))
      this.frameSamples.splice(0, this.frameSamples.length - 
          Math.round(this.sampleLimit));

    if (!this.canvasElement)
      return;

    let ctx = this.ctx || this.canvasElement.getContext('2d');
    if (this.ctx !== ctx)
      this.ctx = ctx;
    if (!ctx)
      return;

    ctx.save();
    ctx.translate(0.5, 0.5);

    // ctx.imageSmoothingEnabled = true;
    // ctx.imageSmoothingQuality = 'high';

    this.peakUpdate(this.needPeakUpdate || this.frameSamples.length === 1);
    this.needPeakUpdate = false;
      
    ctx.clearRect(0, 0, 
        this.canvasElement.width, this.canvasElement.height);
    ctx.lineWidth = 1.33;
    ctx.imageSmoothingEnabled = false;
    
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255, 255, 255, 1)';

    let bestSample = -Infinity;
    let worstSample = Infinity;
    // let bestX = 0;
    // let bestY = 0;
    // let bestIndex = 0;
    // let worstIndex = 0;
    // let worstX = 0;
    // let worstY = 0;

    let avg = 0;
    let avgCount = 0;
    let updatedPeak = 0;
    
    let xs = (this.canvasWidth - this.leftMargin) / this.frameSamples.length;
    let ys = this.canvasHeight / this.peak;
    for (let i = 1; i < this.frameSamples.length; ++i) {
      let x = i * xs + this.leftMargin;
      let sample;
      let smooth = false;
      if (smooth && i > 2) {
        sample = this.frameSamples[i] - this.frameSamples[i-1];
        let prevSample = this.frameSamples[i-1] - this.frameSamples[i-2];
        sample += prevSample;
        prevSample = this.frameSamples[i-2] - this.frameSamples[i-3]
        sample += prevSample;
        sample *= 1/3;
      } else if (smooth && i > 1) {
        sample = this.frameSamples[i] - this.frameSamples[i-1];
        let prevSample = this.frameSamples[i-1] - this.frameSamples[i-2];
        sample = (sample + prevSample) * 0.5;
      } else {
        sample = this.frameSamples[i] - this.frameSamples[i-1];
      }

      updatedPeak = Math.max(updatedPeak, sample);
      avg += sample;
      ++avgCount;
      
      let y = this.canvasHeight - sample * ys;
      
      if (bestSample >= sample) {
        bestSample = sample;
        // bestIndex = i;
        // bestX = x;
        // bestY = y;
      }
      if (worstSample <= sample) {
        worstSample = sample;
        // worstIndex = i;
        // worstX = x;
        // worstY = y;
      }
      if (i > 1) {
        ctx.lineTo(x, y);
      } else {
        ctx.moveTo(x, y);
      }
    }
    ctx.stroke();
    this.instantaneousPeak = updatedPeak;
    avg /= avgCount;
    this.instantaneousFps = 1000 / avg;

    ctx.font = '14px sans-serif';
    const noDash: number[] = [];
    //const dotted: number[] = [4, 4];
    let lines: Array<[number,string,number[]]> = [
      [ 1000000, 'gold', noDash ],
      [ 240, 'gold', noDash ],
      [ 180, 'gold', noDash ], 
      [ 120, 'gold', noDash ],
      [ 75, 'goldenrod', noDash ], 
      [ 60, 'lightgreen', noDash ], 
      [ 30, 'pink', noDash ],
      [ 15, 'red', noDash ],
      [ 5, 'red', noDash ],
      [ 1, 'red', noDash ]
      // [ 1000 / bestSample, 'white', dotted ],
      // [ 1000 / worstSample, 'white', dotted ]
    ];
    for (let index = 0; index < lines.length; ++index) {
      let lineInfo = lines[index];
      let rate = lineInfo[0];
      let color = lineInfo[1];
      let dash = lineInfo[2];
      ctx!.setLineDash(dash);
      ctx!.fillStyle = color;
      let y = this.canvasHeight - (1000/rate) * ys;
      let low = y < 70 || y + 70 >= this.canvasHeight;
      if (y > 0 && !low) {
        ctx!.textAlign = 'left';
        ctx!.fillText('' + rate, 0, y - 3);
      }

      ctx!.textAlign = 'right';
      ctx!.fillText((1000/rate).toFixed(1)+'ms', 
          this.canvasWidth, y - 3);
      
      ctx!.beginPath();
      ctx!.strokeStyle = color;
      ctx!.moveTo(this.leftMargin + (low ? 16 : 0), y);
      ctx!.lineTo(this.canvasWidth, y);
      ctx!.stroke();
    }

    ctx.fillStyle = 'gold';
    ctx.save();
    ctx.translate(3, this.canvasHeight);
    ctx.rotate(-90/180*Math.PI);
    ctx.textAlign = 'left';
    ctx.fillText('⮜ better', 0, 11);//⮞ worse
    ctx.textAlign = 'right';
    ctx.translate(this.canvasHeight, 0);
    ctx.fillStyle = '#c03030';
    ctx.fillText('worse ⮞', 0, 11);//
    ctx.restore();
    ctx.restore();
  }

  private attachCanvas(newCanvas: HTMLCanvasElement | null): void {
    this.canvasElement = newCanvas;

    if (!newCanvas)
      return;
    
    // runonce
    
    this.startPeakInterval();
  }

  private startPeakInterval(): void {
    this.peakTimer = +setInterval(() => {
      this.needPeakUpdate = true;
    }, 1000);
  }

  componentWillUnmount(): void {
    if (this.peakTimer !== null)
      clearInterval(this.peakTimer);
    this.peakTimer = null;
  }

  mapRange(n: number, 
      inMin: number, inMax: number,
      outMin: number, outMax: number): number {
    return Math.max(outMin, Math.min(outMax,
        (n - inMin) / 
        (inMax - inMin) * 
        (outMax - outMin) + 
        outMin));
  }

  private peakVelocity: number = 0;

  peakUpdate(full: boolean): void {
    if (!full) {
      if (!Number.isFinite(this.peak))
        this.peak = 1;
      let delta = this.targetPeak - this.peak;
      //let rate = this.mapRange(Math.abs(delta), 4, 10, 0.05, 0.12);
      //let rate = 0.05 + Math.log2(Math.abs(delta)) * 0.05;
      let rate = this.mapRange(Math.abs(delta), 0, 4, 1, 3);
      if (rate < 0.001)
        this.peakVelocity = 0;
      else if (this.peakVelocity < 1)
        this.peakVelocity += 1/64;
      rate = 0.05 * rate * this.peakVelocity;
      this.peak = (this.peak + delta * rate) || 0;

      let maxPeak = this.instantaneousPeak * 1.333333;
      if (Number.isNaN(this.peak) || this.peak > maxPeak)
        this.targetPeak = this.instantaneousPeak * 1.333333;
      if (this.peak < this.instantaneousPeak)
        this.targetPeak = this.instantaneousPeak * 1.25;

      let wantedSampleLimit = Math.max(32, Math.min(this.fps, 1000)) * 4;
      if (!Number.isNaN(this.sampleLimit))
        this.sampleLimit += (wantedSampleLimit - this.sampleLimit) * 0.1;
      else
        this.sampleLimit = wantedSampleLimit;
    
      return;
    }

    // let peak = -Infinity;
    // let avg = 0;
    // let avgDenom = 0;
    // for (let i = 1; i < this.frameSamples.length; ++i) {
    //   let sample = this.frameSamples[i] - this.frameSamples[i-1];
    //   avg += sample;
    //   ++avgDenom;
    //   peak = Math.max(peak, sample);
    // }
    
    this.fps = this.instantaneousFps;
  }

  resize(width: number, height: number) {
    if (this.canvasElement) {
      this.canvasElement.width = width;
      this.canvasElement.height = height;
      this.canvasWidth = width;
      this.canvasHeight = height;
      this.canvasElement.style.width = width + 'px';
      this.canvasElement.style.height = height + 'px';
    }
  }

  clampWithin(left: number, top: number, 
      right: number, bottom: number): boolean {
    return false;
  }

  render(): JSX.Element {
    return <canvas 
      ref={(el) => this.attachCanvas(el)}
      width={this.canvasWidth} 
      height={this.canvasHeight}
      style={{
        position: "absolute",
        left: '0',
        top: '0',
        width: this.canvasWidth + 'px',
        height: this.canvasHeight + 'px',
        background: 'rgba(0,0,0,0.27)'
      }}
      />;
  }
}
