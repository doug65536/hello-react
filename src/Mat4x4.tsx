export class Mat4x4 {
  static identity(result: Float32Array): void {
    result.set([
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1
    ]);
  }

  static scale(result: Float32Array, 
      x: number, y: number, z: number, w: number = 1): void {
    result.set([
      x, 0, 0, 0,
      0, y, 0, 0,
      0, 0, z, 0,
      0, 0, 0, w
    ]);
  }

  static translate(result: Float32Array, 
    x: number, y: number, z: number): void {
    result.set([
      1, 0, 0, x,
      0, 1, 0, y,
      0, 0, 1, z,
      0, 0, 0, 1
    ]);
  }

  static rotateX(result: Float32Array, angle: number): void {
    let s = Math.sin(angle);
    let c = Math.cos(angle);
    result.set([
      1.0, 0.0, 0.0, 0.0,
      0.0, c, -s, 0.0,
      0.0, s, c, 0.0,
      0.0, 0.0, 0.0, 1.0
    ]);
  }

  static rotateY(result: Float32Array, angle: number): void {
    let s = Math.sin(angle);
    let c = Math.cos(angle);
    result.set([
      c, 0.0, s, 0.0,
      0.0, 1.0, 0.0, 0.0,
      -s, 0.0, c, 0.0,
      0.0, 0.0, 0.0, 1.0
    ]);
  }

  static rotateZ(result: Float32Array, angle: number): void {
    let s = Math.sin(angle);
    let c = Math.cos(angle);
    result.set([
      c, -s, 0.0, 0.0,
      s, c, 0.0, 0.0,
      0.0, 0.0, 1.0, 0.0,
      0.0, 0.0, 0.0, 1.0
    ]);
  }

  static rotateAxis(result: Float32Array, angle: number, 
      x: number, y: number, z: number) {
    let c: number = Math.cos(angle);
    let s: number = Math.sin(angle);
    let t: number = 1 - c;
    let svx: number;
    let svy: number;
    let svz: number;
    let tvx: number;
    let tvy: number;
    let tvz: number;

    svx = x * s;
    svy = y * s;
    svz = z * s;
    tvx = x * t;
    tvy = y * t;
    tvz = z * t;

    result.set([
      tvx * x + c,    // txx + c
      tvx * y - svz,	// txy - sz
      tvx * z + svy,	// txz + sy
      0,
      //
      tvx * y + svz,	// txy + sz
      tvy * y + c,		// tyy + c
      tvy * z - svx,	// tyz - sx
      0,
      //
      tvx * z - svy,	// txz - sy
      tvy * z + svx,	// tyz + sx
      tvz * z + c,		// tzz + c
      0,
      //
      0, 0, 0, 1
    ]);
  }

  static mul(result: Float32Array, lhs: Float32Array, rhs: Float32Array): void {
    result.set([
      lhs[0] * rhs[0] + lhs[1] * rhs[4] + lhs[2] * rhs[8] + lhs[3] * rhs[12],
      lhs[0] * rhs[1] + lhs[1] * rhs[5] + lhs[2] * rhs[9] + lhs[3] * rhs[13],
      lhs[0] * rhs[2] + lhs[1] * rhs[6] + lhs[2] * rhs[10] + lhs[3] * rhs[14],
      lhs[0] * rhs[3] + lhs[1] * rhs[7] + lhs[2] * rhs[11] + lhs[3] * rhs[15],
      lhs[4] * rhs[0] + lhs[5] * rhs[4] + lhs[6] * rhs[8] + lhs[7] * rhs[12],
      lhs[4] * rhs[1] + lhs[5] * rhs[5] + lhs[6] * rhs[9] + lhs[7] * rhs[13],
      lhs[4] * rhs[2] + lhs[5] * rhs[6] + lhs[6] * rhs[10] + lhs[7] * rhs[14],
      lhs[4] * rhs[3] + lhs[5] * rhs[7] + lhs[6] * rhs[11] + lhs[7] * rhs[15],
      lhs[8] * rhs[0] + lhs[9] * rhs[4] + lhs[10] * rhs[8] + lhs[11] * rhs[12],
      lhs[8] * rhs[1] + lhs[9] * rhs[5] + lhs[10] * rhs[9] + lhs[11] * rhs[13],
      lhs[8] * rhs[2] + lhs[9] * rhs[6] + lhs[10] * rhs[10] + lhs[11] * rhs[14],
      lhs[8] * rhs[3] + lhs[9] * rhs[7] + lhs[10] * rhs[11] + lhs[11] * rhs[15],
      lhs[12] * rhs[0] + lhs[13] * rhs[4] + lhs[14] * rhs[8] + lhs[15] * rhs[12],
      lhs[12] * rhs[1] + lhs[13] * rhs[5] + lhs[14] * rhs[9] + lhs[15] * rhs[13],
      lhs[12] * rhs[2] + lhs[13] * rhs[6] + lhs[14] * rhs[10] + lhs[15] * rhs[14],
      lhs[12] * rhs[3] + lhs[13] * rhs[7] + lhs[14] * rhs[11] + lhs[15] * rhs[15]
    ]);
  }

  static determinant(m: Float32Array): number {
    // 72 multiplies, 23 adds (before CSE, tons of common subexpressions)
    return (m[0 * 4 + 3] * m[1 * 4 + 2] * m[2 * 4 + 1] * m[3 * 4 + 0])
      - (m[0 * 4 + 2] * m[1 * 4 + 3] * m[2 * 4 + 1] * m[3 * 4 + 0])
      - (m[0 * 4 + 3] * m[1 * 4 + 1] * m[2 * 4 + 2] * m[3 * 4 + 0])
      + (m[0 * 4 + 1] * m[1 * 4 + 3] * m[2 * 4 + 2] * m[3 * 4 + 0])
      + (m[0 * 4 + 2] * m[1 * 4 + 1] * m[2 * 4 + 3] * m[3 * 4 + 0])
      - (m[0 * 4 + 1] * m[1 * 4 + 2] * m[2 * 4 + 3] * m[3 * 4 + 0])
      - (m[0 * 4 + 3] * m[1 * 4 + 2] * m[2 * 4 + 0] * m[3 * 4 + 1])
      + (m[0 * 4 + 2] * m[1 * 4 + 3] * m[2 * 4 + 0] * m[3 * 4 + 1])
      + (m[0 * 4 + 3] * m[1 * 4 + 0] * m[2 * 4 + 2] * m[3 * 4 + 1])
      - (m[0 * 4 + 0] * m[1 * 4 + 3] * m[2 * 4 + 2] * m[3 * 4 + 1])
      - (m[0 * 4 + 2] * m[1 * 4 + 0] * m[2 * 4 + 3] * m[3 * 4 + 1])
      + (m[0 * 4 + 0] * m[1 * 4 + 2] * m[2 * 4 + 3] * m[3 * 4 + 1])
      + (m[0 * 4 + 3] * m[1 * 4 + 1] * m[2 * 4 + 0] * m[3 * 4 + 2])
      - (m[0 * 4 + 1] * m[1 * 4 + 3] * m[2 * 4 + 0] * m[3 * 4 + 2])
      - (m[0 * 4 + 3] * m[1 * 4 + 0] * m[2 * 4 + 1] * m[3 * 4 + 2])
      + (m[0 * 4 + 0] * m[1 * 4 + 3] * m[2 * 4 + 1] * m[3 * 4 + 2])
      + (m[0 * 4 + 1] * m[1 * 4 + 0] * m[2 * 4 + 3] * m[3 * 4 + 2])
      - (m[0 * 4 + 0] * m[1 * 4 + 1] * m[2 * 4 + 3] * m[3 * 4 + 2])
      - (m[0 * 4 + 2] * m[1 * 4 + 1] * m[2 * 4 + 0] * m[3 * 4 + 3])
      + (m[0 * 4 + 1] * m[1 * 4 + 2] * m[2 * 4 + 0] * m[3 * 4 + 3])
      + (m[0 * 4 + 2] * m[1 * 4 + 0] * m[2 * 4 + 1] * m[3 * 4 + 3])
      - (m[0 * 4 + 0] * m[1 * 4 + 2] * m[2 * 4 + 1] * m[3 * 4 + 3])
      - (m[0 * 4 + 1] * m[1 * 4 + 0] * m[2 * 4 + 2] * m[3 * 4 + 3])
      + (m[0 * 4 + 0] * m[1 * 4 + 1] * m[2 * 4 + 2] * m[3 * 4 + 3]);
  }

  static inverse(result: Float32Array, m: Float32Array): boolean {
    let det = Mat4x4.determinant(m);

    console.assert(det !== 0);

    if (det === 0)
      return false;

    det = 1.0 / det;

    // 192 multiplies, 80 adds, tons of common subexpressions
    result.set([
      det * (
        (m[1 * 4 + 2] * m[2 * 4 + 3] * m[3 * 4 + 1])
        - (m[1 * 4 + 3] * m[2 * 4 + 2] * m[3 * 4 + 1])
        + (m[1 * 4 + 3] * m[2 * 4 + 1] * m[3 * 4 + 2])
        - (m[1 * 4 + 1] * m[2 * 4 + 3] * m[3 * 4 + 2])
        - (m[1 * 4 + 2] * m[2 * 4 + 1] * m[3 * 4 + 3])
        + (m[1 * 4 + 1] * m[2 * 4 + 2] * m[3 * 4 + 3])
      ),
      det * (
        (m[0 * 4 + 3] * m[2 * 4 + 2] * m[3 * 4 + 1])
        - (m[0 * 4 + 2] * m[2 * 4 + 3] * m[3 * 4 + 1])
        - (m[0 * 4 + 3] * m[2 * 4 + 1] * m[3 * 4 + 2])
        + (m[0 * 4 + 1] * m[2 * 4 + 3] * m[3 * 4 + 2])
        + (m[0 * 4 + 2] * m[2 * 4 + 1] * m[3 * 4 + 3])
        - (m[0 * 4 + 1] * m[2 * 4 + 2] * m[3 * 4 + 3])
      ),
      det * (
        (m[0 * 4 + 2] * m[1 * 4 + 3] * m[3 * 4 + 1])
        - (m[0 * 4 + 3] * m[1 * 4 + 2] * m[3 * 4 + 1])
        + (m[0 * 4 + 3] * m[1 * 4 + 1] * m[3 * 4 + 2])
        - (m[0 * 4 + 1] * m[1 * 4 + 3] * m[3 * 4 + 2])
        - (m[0 * 4 + 2] * m[1 * 4 + 1] * m[3 * 4 + 3])
        + (m[0 * 4 + 1] * m[1 * 4 + 2] * m[3 * 4 + 3])
      ),
      det * (
        (m[0 * 4 + 3] * m[1 * 4 + 2] * m[2 * 4 + 1])
        - (m[0 * 4 + 2] * m[1 * 4 + 3] * m[2 * 4 + 1])
        - (m[0 * 4 + 3] * m[1 * 4 + 1] * m[2 * 4 + 2])
        + (m[0 * 4 + 1] * m[1 * 4 + 3] * m[2 * 4 + 2])
        + (m[0 * 4 + 2] * m[1 * 4 + 1] * m[2 * 4 + 3])
        - (m[0 * 4 + 1] * m[1 * 4 + 2] * m[2 * 4 + 3])
      ),
      // ----------------------------
      det * (
        (m[1 * 4 + 3] * m[2 * 4 + 2] * m[3 * 4 + 0])
        - (m[1 * 4 + 2] * m[2 * 4 + 3] * m[3 * 4 + 0])
        - (m[1 * 4 + 3] * m[2 * 4 + 0] * m[3 * 4 + 2])
        + (m[1 * 4 + 0] * m[2 * 4 + 3] * m[3 * 4 + 2])
        + (m[1 * 4 + 2] * m[2 * 4 + 0] * m[3 * 4 + 3])
        - (m[1 * 4 + 0] * m[2 * 4 + 2] * m[3 * 4 + 3])
      ),
      det * (
        (m[0 * 4 + 2] * m[2 * 4 + 3] * m[3 * 4 + 0])
        - (m[0 * 4 + 3] * m[2 * 4 + 2] * m[3 * 4 + 0])
        + (m[0 * 4 + 3] * m[2 * 4 + 0] * m[3 * 4 + 2])
        - (m[0 * 4 + 0] * m[2 * 4 + 3] * m[3 * 4 + 2])
        - (m[0 * 4 + 2] * m[2 * 4 + 0] * m[3 * 4 + 3])
        + (m[0 * 4 + 0] * m[2 * 4 + 2] * m[3 * 4 + 3])
      ),
      det * (
        (m[0 * 4 + 3] * m[1 * 4 + 2] * m[3 * 4 + 0])
        - (m[0 * 4 + 2] * m[1 * 4 + 3] * m[3 * 4 + 0])
        - (m[0 * 4 + 3] * m[1 * 4 + 0] * m[3 * 4 + 2])
        + (m[0 * 4 + 0] * m[1 * 4 + 3] * m[3 * 4 + 2])
        + (m[0 * 4 + 2] * m[1 * 4 + 0] * m[3 * 4 + 3])
        - (m[0 * 4 + 0] * m[1 * 4 + 2] * m[3 * 4 + 3])
      ),
      det * (
        (m[0 * 4 + 2] * m[1 * 4 + 3] * m[2 * 4 + 0])
        - (m[0 * 4 + 3] * m[1 * 4 + 2] * m[2 * 4 + 0])
        + (m[0 * 4 + 3] * m[1 * 4 + 0] * m[2 * 4 + 2])
        - (m[0 * 4 + 0] * m[1 * 4 + 3] * m[2 * 4 + 2])
        - (m[0 * 4 + 2] * m[1 * 4 + 0] * m[2 * 4 + 3])
        + (m[0 * 4 + 0] * m[1 * 4 + 2] * m[2 * 4 + 3])
      ),
      // ----------------------------
      det * (
        (m[1 * 4 + 1] * m[2 * 4 + 3] * m[3 * 4 + 0])
        - (m[1 * 4 + 3] * m[2 * 4 + 1] * m[3 * 4 + 0])
        + (m[1 * 4 + 3] * m[2 * 4 + 0] * m[3 * 4 + 1])
        - (m[1 * 4 + 0] * m[2 * 4 + 3] * m[3 * 4 + 1])
        - (m[1 * 4 + 1] * m[2 * 4 + 0] * m[3 * 4 + 3])
        + (m[1 * 4 + 0] * m[2 * 4 + 1] * m[3 * 4 + 3])
      ),
      det * (
        (m[0 * 4 + 3] * m[2 * 4 + 1] * m[3 * 4 + 0])
        - (m[0 * 4 + 1] * m[2 * 4 + 3] * m[3 * 4 + 0])
        - (m[0 * 4 + 3] * m[2 * 4 + 0] * m[3 * 4 + 1])
        + (m[0 * 4 + 0] * m[2 * 4 + 3] * m[3 * 4 + 1])
        + (m[0 * 4 + 1] * m[2 * 4 + 0] * m[3 * 4 + 3])
        - (m[0 * 4 + 0] * m[2 * 4 + 1] * m[3 * 4 + 3])
      ),
      det * (
        (m[0 * 4 + 1] * m[1 * 4 + 3] * m[3 * 4 + 0])
        - (m[0 * 4 + 3] * m[1 * 4 + 1] * m[3 * 4 + 0])
        + (m[0 * 4 + 3] * m[1 * 4 + 0] * m[3 * 4 + 1])
        - (m[0 * 4 + 0] * m[1 * 4 + 3] * m[3 * 4 + 1])
        - (m[0 * 4 + 1] * m[1 * 4 + 0] * m[3 * 4 + 3])
        + (m[0 * 4 + 0] * m[1 * 4 + 1] * m[3 * 4 + 3])
      ),
      det * (
        (m[0 * 4 + 3] * m[1 * 4 + 1] * m[2 * 4 + 0])
        - (m[0 * 4 + 1] * m[1 * 4 + 3] * m[2 * 4 + 0])
        - (m[0 * 4 + 3] * m[1 * 4 + 0] * m[2 * 4 + 1])
        + (m[0 * 4 + 0] * m[1 * 4 + 3] * m[2 * 4 + 1])
        + (m[0 * 4 + 1] * m[1 * 4 + 0] * m[2 * 4 + 3])
        - (m[0 * 4 + 0] * m[1 * 4 + 1] * m[2 * 4 + 3])
      ),
      // ----------------------------
      det * (
        (m[1 * 4 + 2] * m[2 * 4 + 1] * m[3 * 4 + 0])
        - (m[1 * 4 + 1] * m[2 * 4 + 2] * m[3 * 4 + 0])
        - (m[1 * 4 + 2] * m[2 * 4 + 0] * m[3 * 4 + 1])
        + (m[1 * 4 + 0] * m[2 * 4 + 2] * m[3 * 4 + 1])
        + (m[1 * 4 + 1] * m[2 * 4 + 0] * m[3 * 4 + 2])
        - (m[1 * 4 + 0] * m[2 * 4 + 1] * m[3 * 4 + 2])
      ),
      det * (
        (m[0 * 4 + 1] * m[2 * 4 + 2] * m[3 * 4 + 0])
        - (m[0 * 4 + 2] * m[2 * 4 + 1] * m[3 * 4 + 0])
        + (m[0 * 4 + 2] * m[2 * 4 + 0] * m[3 * 4 + 1])
        - (m[0 * 4 + 0] * m[2 * 4 + 2] * m[3 * 4 + 1])
        - (m[0 * 4 + 1] * m[2 * 4 + 0] * m[3 * 4 + 2])
        + (m[0 * 4 + 0] * m[2 * 4 + 1] * m[3 * 4 + 2])
      ),
      det * (
        (m[0 * 4 + 2] * m[1 * 4 + 1] * m[3 * 4 + 0])
        - (m[0 * 4 + 1] * m[1 * 4 + 2] * m[3 * 4 + 0])
        - (m[0 * 4 + 2] * m[1 * 4 + 0] * m[3 * 4 + 1])
        + (m[0 * 4 + 0] * m[1 * 4 + 2] * m[3 * 4 + 1])
        + (m[0 * 4 + 1] * m[1 * 4 + 0] * m[3 * 4 + 2])
        - (m[0 * 4 + 0] * m[1 * 4 + 1] * m[3 * 4 + 2])
      ),
      det * (
        (m[0 * 4 + 1] * m[1 * 4 + 2] * m[2 * 4 + 0])
        - (m[0 * 4 + 2] * m[1 * 4 + 1] * m[2 * 4 + 0])
        + (m[0 * 4 + 2] * m[1 * 4 + 0] * m[2 * 4 + 1])
        - (m[0 * 4 + 0] * m[1 * 4 + 2] * m[2 * 4 + 1])
        - (m[0 * 4 + 1] * m[1 * 4 + 0] * m[2 * 4 + 2])
        + (m[0 * 4 + 0] * m[1 * 4 + 1] * m[2 * 4 + 2])
      )
    ]);
    return true;
  }

  static proj(result: Float32Array, l: number, t: number,
    r: number, b: number,
    n: number, f: number): void {
    let n2 = 2 * n;
    let rml = r - l;
    let rpl = r + l;
    let tmb = t - b;
    let tpb = t + b;
    let fmn = f - n;
    let fpn = f + n;
    let x = n2 / rml;
    let y = n2 / tmb;
    let A = rpl / rml;
    let B = tpb / tmb;
    let C = -fpn / fmn;
    let D = -(f * n2) / fmn;

    result.set([
      x, 0, A, 0,
      0.0, y, B, 0,
      0, 0, C, D,
      0.0, 0, -1, 0
    ]);
  }

  // Slot 0 and 1 are used (alternated) as result slot
  private stack: Float32Array = new Float32Array(64*8);
  private temp: Float32Array = this.stack.subarray(0, 16);
  private indexes: Int32Array = new Int32Array(64*2);
  private mapping: Int32Array;
  private free: Int32Array;
  private top: Float32Array;
  private sp: number = 0;
  private firstFree: number = -1;

  constructor() {
    let i;

    this.mapping = this.indexes.subarray(0, 64);
    this.free = this.indexes.subarray(64, 128);
    this.top = this.stack.subarray(16, 16+16);

    this.free[63] = -1;
    for (i = 63; i > 2; --i)
      this.free[i-1] = i;
    this.firstFree = i;
    this.mapping[0] = 1;
    this.free[0] = -2;
    this.free[1] = -2;
    Mat4x4.identity(this.top);
  }

  private allocSlot(): number {
    console.assert(this.firstFree >= 0);
    let slot = this.firstFree;
    this.firstFree = this.free[this.firstFree];
    this.free[slot] = -2;
    return slot;
  }

  private freeSlot(slot: number): void {
    console.assert(this.free[slot] === -2);
    this.free[slot] = this.firstFree;
    this.firstFree = slot;    
  }

  getTemp(): Float32Array {
    return this.temp;
  }

  clear(): void {
  }

  get(): Float32Array {
    return this.top;
  }

  // Push top
  push(): void {
    let spSlot = this.mapping[this.sp];
    let newSlot = this.allocSlot();
    this.stack.copyWithin(newSlot * 16, spSlot * 16, spSlot * 16 + 16);
    this.mapping[++this.sp] = newSlot;
    this.top = this.stack.subarray(newSlot * 16, newSlot * 16 + 16);
  }

  // Push specified matrix
  push_load(rhs: Float32Array | number[]): void {
    console.log(rhs.length === 16);
    let newSlot = this.allocSlot();    
    this.mapping[++this.sp] = newSlot;
    this.top = this.stack.subarray(newSlot * 16, newSlot * 16 + 16);
    this.top.set(rhs);
  }

  // Push identity
  push_identity(): void {
    let newSlot = this.allocSlot();    
    this.mapping[++this.sp] = newSlot;
    this.top = this.stack.subarray(newSlot * 16, newSlot * 16 + 16);
    Mat4x4.identity(this.top);
  }

  // Push identity
  push_uninitialized(): Float32Array {
    let newSlot = this.allocSlot();    
    this.mapping[++this.sp] = newSlot;
    return this.top = this.stack.subarray(newSlot * 16, newSlot * 16 + 16);
  }
  
  pop(): void {
    console.assert(this.sp > 0);
    let oldTopSlot: number = this.mapping[this.sp];
    let spSlot = this.mapping[--this.sp];
    this.freeSlot(oldTopSlot);
    this.top = this.stack.subarray(spSlot * 16, spSlot * 16 + 16);
  }

  identity(): void {
    Mat4x4.identity(this.get());
  }

  set(rhs: Float32Array | number[]): void {
    console.assert(rhs.length === 16);
    this.top.set(rhs);
  }

  transformTop(callback: (newTop: Float32Array) => void): void {
    let oldTopSlot: number = this.mapping[this.sp];
    let newTopSlot: number = this.allocSlot();
    let newTop: Float32Array = this.stack.subarray(
        newTopSlot * 16, newTopSlot * 16 + 16);
    callback(newTop);
    this.mapping[this.sp] = newTopSlot;
    this.freeSlot(oldTopSlot);
    this.top = newTop;    
  }

  scale(x: number, y: number, z: number, w: number = 1): void {
    this.transformTop((newTop) => {
      Mat4x4.scale(this.temp, x, y, z, w);
      Mat4x4.mul(newTop, this.top, this.temp);
    });
  }

  rotateAxis(angle: number = 0, x: number, y: number, z: number): void {
    this.transformTop((newTop) => {
      Mat4x4.rotateAxis(this.temp, angle, x, y, z);
      Mat4x4.mul(newTop, this.top, this.temp);
    });
  }

  rotateX(angle: number = 0): void {
    this.transformTop((newTop) => {
      Mat4x4.rotateX(this.temp, angle);
      Mat4x4.mul(newTop, this.top, this.temp);
    });
  }

  rotateY(angle: number = 0): void {
    this.transformTop((newTop) => {
      Mat4x4.rotateY(this.temp, angle);
      Mat4x4.mul(newTop, this.top, this.temp);
    });
  }

  rotateZ(angle: number = 0): void {
    this.transformTop((newTop) => {
      Mat4x4.rotateZ(this.temp, angle);
      Mat4x4.mul(newTop, this.top, this.temp);
    });
  }

  translate(x: number, y: number, z: number): void {
    this.transformTop((newTop) => {
      Mat4x4.translate(this.temp, x, y, z);
      Mat4x4.mul(newTop, this.top, this.temp);
    });
  }
}
