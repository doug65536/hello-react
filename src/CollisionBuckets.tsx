import { RigidBody, OptionalRigidBody } from "./RigidBody";

export class CollisionBuckets {
  // private oldx: number = 0;
  // private oldy: number = 0;
  // private oldBody: OptionalRigidBody = null;
  public ignoredCollisions = new Map<RigidBody, Set<RigidBody>>();

  // Sparse grid of 128x128 pixel buckets
  // Rows, columns, and bucket lists are created on first demand
  private buckets: RigidBody[][][] = [];

  newFrame(): void {
    this.ignoredCollisions.clear();
  }

  insertIgnore(from: RigidBody, to: RigidBody): void {
    let peerSet = this.ignoredCollisions.get(from);
    if (peerSet === undefined) {
      peerSet = new Set<RigidBody>();
      this.ignoredCollisions.set(from, peerSet);
    }
    peerSet.add(to);
  }

  shouldIgnore(from: RigidBody, to: RigidBody): boolean {
    let peerSet = this.ignoredCollisions.get(from);
    if (peerSet === undefined)
      return false;
    return peerSet.has(to);
  }

  bucketAt(row: number, col: number): RigidBody[] {
    row = Math.max(0, row);
    col = Math.max(0, col);
    row = Math.min(1023, row);
    col = Math.min(1023, col);
    if (!this.buckets[row])
      this.buckets[row] = [];

    if (!this.buckets[row][col])
      this.buckets[row][col] = [];

    return this.buckets[row][col];
  }

  static indexFromCoord(xy: number): number {
    return Math.max(0, xy) >> 7;
  }

  insertBody(body: RigidBody): void {
    let row = CollisionBuckets.indexFromCoord(body.py);
    let col = CollisionBuckets.indexFromCoord(body.px);
    let bucket = this.bucketAt(row, col);
    console.assert(body.cx < 0);
    console.assert(body.cy < 0);
    console.assert(bucket.indexOf(body) < 0, 'already in the bucket?!');
    console.assert(bucket.indexOf(null as any) < 0, 'how is null in there?');
    body.cx = col;
    body.cy = row;
    bucket.push(body);
    //console.log('inserted body, new buckets:', this.buckets);
  }

  removeBody(body: RigidBody) {
    console.assert(body.cx >= 0 && body.cy >= 0, 'not inserted?!');
    let row = body.cy;
    let col = body.cx;
    let bucket = this.bucketAt(row, col);
    let index = bucket.indexOf(body);
    console.assert(index >= 0, 'removing but not there');
    let lastItem = bucket.pop();
    if (bucket.length)
      bucket[index] = lastItem!;
    bucket.pop();
    body.cx = -1;
    body.cy = -1;
  }

  moveBody(body: RigidBody, newx: number, newy: number): void {
    let oldRow = body.cy;
    let oldCol = body.cx;
    let newRow = CollisionBuckets.indexFromCoord(newy);
    let newCol = CollisionBuckets.indexFromCoord(newx);

    // If bucket changed
    if (oldRow !== newRow || oldCol !== newCol) {
      //console.log('bucket changed');
      let oldBucket = this.bucketAt(oldRow, oldCol);
      let newBucket = this.bucketAt(newRow, newCol);

      let oldIndex = oldBucket.indexOf(body);
      console.assert(oldIndex >= 0, 'buckets not updated correctly');
      // Copy last item on top of removed item
      oldBucket[oldIndex] = oldBucket[oldBucket.length - 1];
      // Remove the duplicate left as last item
      oldBucket.pop();
      body.cx = newCol;
      body.cy = newRow;
      newBucket.push(body);
    }
  }

  bodiesNear(x: number, y: number, radius: number): RigidBody[][] {
    let topBucket = CollisionBuckets.indexFromCoord(y - radius) - 1;
    let bottomBucket = CollisionBuckets.indexFromCoord(y + radius) + 1;
    let leftBucket = CollisionBuckets.indexFromCoord(x - radius) - 1;
    let rightBucket = CollisionBuckets.indexFromCoord(x + radius) + 1;

    topBucket = Math.max(0, topBucket);
    bottomBucket = Math.max(0, bottomBucket);
    leftBucket = Math.max(0, leftBucket);
    rightBucket = Math.max(0, rightBucket);

    let result = [];
    for (let r = topBucket; r <= bottomBucket; ++r) {
      if (this.buckets[r]) {
        for (let c = leftBucket; c <= rightBucket; ++c) {
          if (this.buckets[r][c])
            result.push(this.buckets[r][c]);
        }
      }
    }
    return result;
  }

  validate(expectedBodies: OptionalRigidBody[]): boolean {
    let success: boolean = true;

    let unaccounted = new Set<RigidBody>(
      expectedBodies.filter((body) => body) as RigidBody[]);

    this.buckets.forEach((row) => {
      row.forEach((col) => {
        col.forEach((body) => {
          let expectcx = CollisionBuckets.indexFromCoord(body.px);
          let expectcy = CollisionBuckets.indexFromCoord(body.py);
          console.assert(success = success && expectcx === body.cx);
          console.assert(success = success && expectcy === body.cy);
          unaccounted.delete(body);
        });
      });
    });

    console.assert(success = success && unaccounted.size === 0,
      unaccounted.size + ' body/bodies is/are not in a bucket');

    return success;
  }
}
