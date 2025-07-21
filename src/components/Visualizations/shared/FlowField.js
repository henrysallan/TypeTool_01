import Vector2 from './Vector2';

export default class FlowField {
  constructor(width, height, params) {
    this.width = width;
    this.height = height;
    this.params = params;
    this.currentPath = [];
    this.init();
  }

  init() {
    this.cols = Math.floor(this.width / this.params.fieldResolution) + 1;
    this.rows = Math.floor(this.height / this.params.fieldResolution) + 1;
    this.grid = [];
    
    for (let i = 0; i <= this.cols; i++) {
      this.grid[i] = [];
      for (let j = 0; j <= this.rows; j++) {
        this.grid[i][j] = new Vector2(0, 0);
      }
    }
  }

  updateParams(params) {
    const oldResolution = this.params.fieldResolution;
    this.params = params;
    if (oldResolution !== params.fieldResolution) {
      this.init();
    }
  }

  clear() {
    for (let i = 0; i <= this.cols; i++) {
      for (let j = 0; j <= this.rows; j++) {
        this.grid[i][j] = new Vector2(0, 0);
      }
    }
  }

  startPath(x, y) {
    this.currentPath = [new Vector2(x, y)];
  }

  addPathPoint(x, y) {
    if (this.currentPath.length > 0) {
      const lastPoint = this.currentPath[this.currentPath.length - 1];
      const currentPoint = new Vector2(x, y);
      if (Vector2.dist(lastPoint, currentPoint) > 5) {
        this.currentPath.push(currentPoint);
      }
    }
  }

  endPath() {
    if (this.currentPath.length > 1) {
      this.applyPathToField(this.currentPath);
    }
    this.currentPath = [];
  }

  applyPathToField(path) {
    if (path.length < 2) return;

    for (let i = 0; i <= this.cols; i++) {
      for (let j = 0; j <= this.rows; j++) {
        const gridPos = new Vector2(i * this.params.fieldResolution, j * this.params.fieldResolution);
        let closestDist = Infinity;
        let closestIndex = -1;

        for (let k = 0; k < path.length; k++) {
          const d = Vector2.dist(gridPos, path[k]);
          if (d < closestDist) {
            closestDist = d;
            closestIndex = k;
          }
        }

        if (closestIndex !== -1 && closestDist < this.params.pathInfluenceRadius) {
          const p_before = path[Math.max(0, closestIndex - 1)];
          const p_after = path[Math.min(path.length - 1, closestIndex + 1)];
          const pathDir = Vector2.sub(p_after, p_before).normalize();
          const strength = this.map(closestDist, 0, this.params.pathInfluenceRadius, 1, 0);
          const force = pathDir.mult(strength * this.params.pathMagnitude);
          this.grid[i][j].add(force);
        }
      }
    }
  }

  getFlowVector(x, y) {
    const gridX = Math.floor(x / this.params.fieldResolution);
    const gridY = Math.floor(y / this.params.fieldResolution);
    
    if (gridX < 0 || gridX >= this.cols - 1 || gridY < 0 || gridY >= this.rows - 1) {
      return new Vector2(0, 0);
    }

    const xAmt = (x % this.params.fieldResolution) / this.params.fieldResolution;
    const yAmt = (y % this.params.fieldResolution) / this.params.fieldResolution;

    const v1 = this.grid[gridX][gridY];
    const v2 = this.grid[gridX + 1][gridY];
    const v3 = this.grid[gridX][gridY + 1];
    const v4 = this.grid[gridX + 1][gridY + 1];

    const top = Vector2.lerp(v1, v2, xAmt);
    const bottom = Vector2.lerp(v3, v4, xAmt);
    return Vector2.lerp(top, bottom, yAmt);
  }

  draw(ctx) {
    if (this.params.visualizeAsStreamlines) {
      this.drawStreamlines(ctx);
    } else {
      this.drawFieldTicks(ctx);
    }

    if (this.currentPath.length > 0) {
      this.drawCurrentPath(ctx);
    }
  }

  drawStreamlines(ctx) {
    const res = this.params.fieldResolution;
    ctx.strokeStyle = this.params.lineColor + '26'; // Add transparency
    ctx.lineWidth = this.params.lineThickness;

    for (let i = 0; i < this.cols; i += 2) {
      for (let j = 0; j < this.rows; j += 2) {
        const pos = new Vector2(i * res, j * res);
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);

        for (let k = 0; k < this.params.streamlineLength; k++) {
          const gridX = Math.floor(pos.x / res);
          const gridY = Math.floor(pos.y / res);
          
          if (gridX >= 0 && gridX < this.cols && gridY >= 0 && gridY < this.rows && this.grid[gridX][gridY]) {
            const v = this.grid[gridX][gridY].copy();
            pos.add(v.mult(2));
            ctx.lineTo(pos.x, pos.y);
            
            if (pos.x > this.width || pos.x < 0 || pos.y > this.height || pos.y < 0) break;
          } else {
            break;
          }
        }
        ctx.stroke();
      }
    }
  }

  drawFieldTicks(ctx) {
    const res = this.params.fieldResolution;
    ctx.strokeStyle = this.params.lineColor + '80'; // Add transparency
    ctx.lineWidth = this.params.lineThickness;

    for (let i = 0; i <= this.cols; i++) {
      for (let j = 0; j <= this.rows; j++) {
        const x = i * res;
        const y = j * res;
        const v = this.grid[i][j];

        if (v.mag() > 0) {
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(v.heading());
          const len = v.mag() * 10;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(len, 0);
          ctx.moveTo(len, 0);
          ctx.lineTo(len - 3, -2);
          ctx.moveTo(len, 0);
          ctx.lineTo(len - 3, 2);
          ctx.stroke();
          ctx.restore();
        }
      }
    }
  }

  drawCurrentPath(ctx) {
    if (this.currentPath.length < 2) return;
    
    ctx.strokeStyle = this.params.lineColor;
    ctx.lineWidth = this.params.lineThickness + 2;
    ctx.beginPath();
    ctx.moveTo(this.currentPath[0].x, this.currentPath[0].y);
    
    for (let i = 1; i < this.currentPath.length; i++) {
      ctx.lineTo(this.currentPath[i].x, this.currentPath[i].y);
    }
    ctx.stroke();
  }

  map(value, start1, stop1, start2, stop2) {
    return start2 + (stop2 - start2) * ((value - start1) / (stop1 - start1));
  }
}