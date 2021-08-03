import React from "react";

interface PieceProps {
  glyph: string;
}

class Piece extends React.Component<PieceProps> {
  private glyph: string;
  private leftValue: string | number = 0;
  private topValue: string | number = 0;
  private element: HTMLDivElement | null = null;

  constructor(props: PieceProps) {
    super(props);
    this.glyph = props.glyph;
  }

  render(): JSX.Element {
    return <div
        ref={(el) => this.element = el}
        style={{
          left: this.leftValue, 
          top: this.topValue,
          position: 'absolute',
          fontSize: '5em',
          animation: 'App-logo-spin infinite 20s linear'
        }}>
      {this.glyph}
    </div>;
  }

  public get left(): string {
    return this.leftValue + 'px';
  }

  public get top(): string {
    return this.topValue + 'px';
  }

  public set left(value: string | number) {
    if (this.element)
      this.element.style.left = value + 'px';
    this.leftValue = value;
    //this.setState({});
  }

  public set top(value: string | number) {
    if (this.element)
      this.element.style.top = value + 'px';
    this.topValue = value;
    //this.setState({});
  }
}

class CrazySpiralApp extends React.Component<{}> {
  prevCount = 0;
  renderCount = 0;
  activePieces: Array<Piece | null> = [];
  fpsMeter: HTMLCanvasElement | null = null;
  frameSamples: number[] = [];

  private pieces = '♔♕♖♗♘♙♚♛♜♝♞♟♔♕♖♗♘♙♚♛♜♝♞♟♔♕♖♗♘♙♚♛♜♝♞♟♔♕♖♗♘♙♚♛♜♝♞♟♔♕♖♗♘♙♚♛♜♝♞♟';
  private start = performance.now();

  componentDidMount() {
    this.updateUI();

    setInterval(() => {
      let count = this.renderCount;
      let elap = count - this.prevCount;
      this.prevCount = count;
      console.log(elap, 'fps');
    }, 1000);
  }

  render(): JSX.Element {
    let now = performance.now();

    return (
      <div className="App">
        <header className="App-header">
          <p>
            Edit <code>src/App.js</code> and save to reload.
          </p>
          <a
            className="App-link"
            href="https://reactjs.org"
            target="_blank"
            rel="noopener noreferrer">
            Learn React
          </a>
          <p>{now - this.start}</p>
        </header>
        {
          this.pieces.split('').map((piece, i) => {
            return (
              <Piece
                key={i + '_'}
                glyph={piece}
                ref={(piece) => { this.activePieces[i] = piece; }}
                />
            );
          })
        }
        <div className="fps-meter">
          <canvas width="600" height="400"
            ref={(el) => { this.fpsMeter = el; }}
            />
        </div>
      </div>
    );
  }

  renderFpsMeter(now: number) {
    if (!this.fpsMeter)
      return;
    
    this.frameSamples.push(now);
    if (this.frameSamples.length > 300)
      this.frameSamples.shift();
    ++this.renderCount;

    var ctx = this.fpsMeter.getContext('2d');
    if (!ctx)
      return;
    
    let yFromElap = (ms: number) => {
      return 400 - ms * 200 / 16.666;
    }
    
    ctx.clearRect(0, 0, 600, 400);
    ctx.strokeStyle = "rgba(255,255,255,1)";
    ctx.rect(-5, -5, 10, 10);
    for (let i = 1, e = this.frameSamples.length; i < e; ++i) {
      let elapms = this.frameSamples[i] - this.frameSamples[i-1];
      let y = yFromElap(elapms);
      let x = i * 2;
      
      if (i !== 1) {
        ctx.lineTo(x, y);
      } else {
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(255,255,255,1.0)';
        ctx.moveTo(x, y);
      }
    }
    ctx.stroke();

    [75, 60, 40].forEach((freq) => {
      if (!ctx)
        return;
      let y = yFromElap(1000/freq);
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(0, 240, 240, 1)';
      ctx.moveTo(0, y);
      ctx.lineTo(600, y);
      ctx.stroke();
    });
  }

  updateUI() {
    requestAnimationFrame(() => {
      console.log('updating');

      let now = performance.now();

      this.renderFpsMeter(now);

      this.setState({}, () => {
        let phase = (performance.now() - this.start) % 1000;
    
        let step = 2 * Math.PI / this.activePieces.length;
        this.activePieces.filter((piece) => piece).forEach((piece, i) => {
          let n = phase * Math.PI * 2 / 1000 - Math.PI + i * step;
          let rad = 200 - i * 5;
          let x = Math.cos(n) * rad;
          let y = -Math.sin(n) * rad;
          x += 200 + rad;
          y += 200 + rad;
          piece!.left = x;
          piece!.top = y;
        });
        
        this.updateUI();
      });
    });
  }
  
}
