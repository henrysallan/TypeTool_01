import { Delaunay } from 'd3-delaunay';
import Vector2 from './shared/Vector2';
import SpatialGrid from './shared/SpatialGrid';

class FracturePiece {
  constructor(vertices) {
    this.vertices = vertices;
    this.recalculateCentroid();
    this.pos = this.centroid.copy();
    this.originalPos = this.centroid.copy();
    this.vel = new Vector2(0, 0);
    this.acc = new Vector2(0, 0);
    this.angle = 0;
    this.angularVelocity = 0;
    this.angularDamping = 0.98;
    this.mass = this.calculateArea();
    this.closestNeighbors = [];
  }

  recalculateCentroid() {
    let totalX = 0, totalY = 0;
    for (const v of this.vertices) {
      totalX += v.x;
      totalY += v.y;
    }
    this.centroid = new Vector2(totalX / this.vertices.length, totalY / this.vertices.length);
  }

  calculateArea() {
    let area = 0;
    for (let i = 0; i < this.vertices.length; i++) {
      const v1 = this.vertices[i];
      const v2 = this.vertices[(i + 1) % this.vertices.length];
      area += (v1.x * v2.y - v2.x * v1.y);
    }
    return Math.abs(area / 2);
  }

  applyForce(force) {
    this.acc.add(force);
  }

  update(params, flowField, canvasWidth, canvasHeight, gravity) {
    if (gravity) {
        this.applyForce(gravity.copy().mult(params.gravityStrength));
    }
    if (params.flowInfluence > 0 && flowField) {
      const flowVector = flowField.getFlowVector(this.pos.x, this.pos.y);
      const flowInfluence = Vector2.lerp(new Vector2(0, 0), flowVector, params.flowInfluence);
      this.applyForce(flowInfluence.mult(params.flowSpeed));
    }

    const springForce = Vector2.sub(this.originalPos, this.pos);
    this.applyForce(springForce.mult(params.stiffness * 0.1));

    this.vel.add(this.acc);
    this.vel.mult(params.damping);
    this.pos.add(this.vel);
    this.acc.mult(0);

    this.angularVelocity *= this.angularDamping;
    this.angle += this.angularVelocity;

    this.checkBounds(canvasWidth, canvasHeight, gravity);
  }
  
  findClosestNeighbors(nearby, maxDistance, maxConnections) {
    this.closestNeighbors = [];
    const distances = [];
    
    for (const other of nearby) {
      if (other !== this) {
        const d = Vector2.dist(this.pos, other.pos);
        if (d < maxDistance) {
          distances.push({ piece: other, distance: d });
        }
      }
    }
    
    distances.sort((a, b) => a.distance - b.distance);
    this.closestNeighbors = distances.slice(0, maxConnections).map(d => d.piece);
  }

  checkBounds(width, height, gravity) {
    if (gravity) {
      if (this.pos.x > width) { this.vel.x *= -0.5; this.pos.x = width; }
      if (this.pos.x < 0) { this.vel.x *= -0.5; this.pos.x = 0; }
      if (this.pos.y > height) { this.vel.y *= -0.5; this.pos.y = height; }
      if (this.pos.y < 0) { this.vel.y *= -0.5; this.pos.y = 0; }
    } else {
      if (this.pos.x > width + 50) this.pos.x = -50;
      if (this.pos.x < -50) this.pos.x = width + 50;
      if (this.pos.y > height + 50) this.pos.y = -50;
      if (this.pos.y < -50) this.pos.y = height + 50;
    }
  }

  draw(ctx, params) {
    ctx.save();
    ctx.translate(this.pos.x, this.pos.y);
    ctx.rotate(this.angle);

    if (params.useFill) {
      ctx.fillStyle = params.fillColor;
    }
    ctx.strokeStyle = params.strokeColor;
    ctx.lineWidth = params.strokeWeight;

    ctx.beginPath();
    for (let i = 0; i < this.vertices.length; i++) {
      const v = this.vertices[i];
      if (i === 0) {
        ctx.moveTo(v.x - this.centroid.x, v.y - this.centroid.y);
      } else {
        ctx.lineTo(v.x - this.centroid.x, v.y - this.centroid.y);
      }
    }
    ctx.closePath();

    if (params.useFill) {
      ctx.fill();
    }
    ctx.stroke();

    ctx.restore();
  }
}

export default class VoronoiFracture {
  constructor(canvas, voronoiParams, sharedParams, flowField) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.voronoiParams = voronoiParams;
    this.sharedParams = sharedParams;
    this.flowField = flowField;
    this.pieces = [];
    this.spatialGrid = new SpatialGrid(100);
    this.createFractures();
  }
  
  reset() {
    for (const p of this.pieces) {
      p.pos.x = p.originalPos.x;
      p.pos.y = p.originalPos.y;
      p.vel.mult(0);
      p.angle = 0;
      p.angularVelocity = 0;
    }
  }

  createFractures() {
    this.pieces = [];
    const pg = document.createElement('canvas');
    pg.width = this.canvas.width;
    pg.height = this.canvas.height;
    const pgCtx = pg.getContext('2d');
    
    pgCtx.fillStyle = 'white';
    pgCtx.font = `bold ${this.sharedParams.fontSize}px ${this.sharedParams.fontFamily}`;
    pgCtx.textAlign = 'center';
    pgCtx.textBaseline = 'middle';
    pgCtx.letterSpacing = `${this.sharedParams.letterSpacing}px`;

    const lines = this.sharedParams.text.split('\n');
    const lineHeight = this.sharedParams.fontSize * this.sharedParams.lineHeight;
    const totalTextHeight = (lines.length - 1) * lineHeight;
    
    const centerX = pg.width / 2 + this.sharedParams.offsetX;
    const centerY = pg.height / 2 + this.sharedParams.offsetY;

    pgCtx.save();
    pgCtx.translate(centerX, centerY);
    pgCtx.scale(this.sharedParams.scaleX, this.sharedParams.scaleY);
    pgCtx.transform(1, 0, this.sharedParams.shear, 1, 0, 0);

    lines.forEach((line, index) => {
        const yPos = index * lineHeight - totalTextHeight / 2;
        pgCtx.fillText(line, 0, yPos);
    });
    pgCtx.restore();
    
    const imageData = pgCtx.getImageData(0, 0, pg.width, pg.height);
    const pixels = imageData.data;
    const textPoints = [];
    for (let x = 0; x < pg.width; x += 3) {
      for (let y = 0; y < pg.height; y += 3) {
        const index = (x + y * pg.width) * 4;
        if (pixels[index] > 128) {
          textPoints.push(new Vector2(x, y));
        }
      }
    }
    if (textPoints.length === 0) return;
    const seeds = [];
    for (let i = 0; i < this.voronoiParams.cellCount; i++) {
        seeds.push(textPoints[Math.floor(Math.random() * textPoints.length)]);
    }
    if (seeds.length < 3) return;
    const delaunay = Delaunay.from(seeds.map(p => [p.x, p.y]));
    const pointGroups = new Map();
    for(const pt of textPoints) {
        const closestSeedIndex = delaunay.find(pt.x, pt.y);
        if(!pointGroups.has(closestSeedIndex)) {
            pointGroups.set(closestSeedIndex, []);
        }
        pointGroups.get(closestSeedIndex).push(pt);
    }
    for(const group of pointGroups.values()) {
        if(group.length < 3) continue;
        const hull = this.convexHull(group);
        if(hull.length >= 3) {
            this.pieces.push(new FracturePiece(hull));
        }
    }
  }

  convexHull(points) {
    points.sort((a, b) => a.x - b.x || a.y - b.y);

    const crossProduct = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);

    const lower = [];
    for (const p of points) {
        while (lower.length >= 2 && crossProduct(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
            lower.pop();
        }
        lower.push(p);
    }

    const upper = [];
    for (let i = points.length - 1; i >= 0; i--) {
        const p = points[i];
        while (upper.length >= 2 && crossProduct(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
            upper.pop();
        }
        upper.push(p);
    }

    return lower.slice(0, lower.length - 1).concat(upper.slice(0, upper.length - 1));
  }

  updateParams(newShared, newVoronoi) {
    const shouldRecreate =
      this.sharedParams.text !== newShared.text ||
      this.sharedParams.fontSize !== newShared.fontSize ||
      this.sharedParams.fontFamily !== newShared.fontFamily ||
      this.voronoiParams.cellCount !== newVoronoi.cellCount ||
      this.sharedParams.offsetX !== newShared.offsetX ||
      this.sharedParams.offsetY !== newShared.offsetY ||
      this.sharedParams.letterSpacing !== newShared.letterSpacing ||
      this.sharedParams.lineHeight !== newShared.lineHeight ||
      this.sharedParams.scaleX !== newShared.scaleX ||
      this.sharedParams.scaleY !== newShared.scaleY ||
      this.sharedParams.shear !== newShared.shear;
      
    this.sharedParams = newShared;
    this.voronoiParams = newVoronoi;
    
    if (shouldRecreate) {
      this.createFractures();
    }
  }

  update(mouse, interactionMode, gravity) {
    this.spatialGrid.clear();

    for (const piece of this.pieces) {
      this.spatialGrid.add(piece);
    }

    for (let i = 0; i < this.pieces.length; i++) {
      const pieceA = this.pieces[i];

      if (interactionMode === 'repel' && mouse.isPressed) {
        const repelForce = Vector2.sub(pieceA.pos, new Vector2(mouse.x, mouse.y));
        const distSq = repelForce.magSq();
        
        if (distSq < this.sharedParams.repelRadius * this.sharedParams.repelRadius && distSq > 0) {
          repelForce.setMag(this.sharedParams.repelForce * 0.1);
          pieceA.applyForce(repelForce);
        }
      }
      
      if (this.sharedParams.showClosestLines) {
        const nearby = this.spatialGrid.getNearby(pieceA, this.sharedParams.closestSearchDistance);
        pieceA.findClosestNeighbors(nearby, this.sharedParams.closestSearchDistance, this.sharedParams.maxClosestConnections);
      }

      pieceA.update(this.sharedParams, this.flowField, this.canvas.width, this.canvas.height, gravity);

      if(this.voronoiParams.enableCollisions) {
          const nearby = this.spatialGrid.getNearby(pieceA, 100);
          for (const pieceB of nearby) {
            if (pieceB === pieceA || this.pieces.indexOf(pieceB) <= i) continue;

            const d = Vector2.dist(pieceA.pos, pieceB.pos);
            if (d < 100) {
              const collisionInfo = this.checkCollision(pieceA, pieceB);
              if (collisionInfo) {
                this.resolveCollision(pieceA, pieceB, collisionInfo);
              }
            }
          }
      }
    }
  }

  draw(ctx) {
    if (this.sharedParams.showConnections) {
      this.drawPlexusConnections(ctx);
    }
    
    if (this.sharedParams.showClosestLines) {
      ctx.strokeStyle = this.voronoiParams.strokeColor;
      ctx.lineWidth = 0.5;
      
      for (const piece of this.pieces) {
        for (const neighbor of piece.closestNeighbors) {
          ctx.beginPath();
          ctx.moveTo(piece.pos.x, piece.pos.y);
          ctx.lineTo(neighbor.pos.x, neighbor.pos.y);
          ctx.stroke();
        }
      }
    }

    for (const piece of this.pieces) {
      piece.draw(ctx, this.voronoiParams);
    }
  }
  
  drawPlexusConnections(ctx) {
    ctx.lineWidth = 0.5;
    const maxDistSq = this.sharedParams.connectionDistance * this.sharedParams.connectionDistance;
    
    for (const p1 of this.pieces) {
      const nearby = this.spatialGrid.getNearby(p1, this.sharedParams.connectionDistance);
      const neighbors = [];
      
      for (const p2 of nearby) {
        if (p1 === p2) continue;
        const dx = p1.pos.x - p2.pos.x;
        const dy = p1.pos.y - p2.pos.y;
        const dSq = dx * dx + dy * dy;
        
        if (dSq < maxDistSq) {
          neighbors.push({ piece: p2, distance: dSq });
        }
      }
      
      neighbors.sort((a, b) => a.distance - b.distance);
      const connections = neighbors.slice(0, 2);
      
      for (const neighbor of connections) {
        const d = Math.sqrt(neighbor.distance);
        const alpha = this.map(d, 0, this.sharedParams.connectionDistance, 150, 0);
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha / 255})`;
        ctx.beginPath();
        ctx.moveTo(p1.pos.x, p1.pos.y);
        ctx.lineTo(neighbor.piece.pos.x, neighbor.piece.pos.y);
        ctx.stroke();
      }
    }
  }

  map(value, start1, stop1, start2, stop2) {
    return start2 + (stop2 - start2) * ((value - start1) / (stop1 - start1));
  }

  checkCollision(polyA, polyB) {
    const verticesA = polyA.vertices.map(v => {
      const rotated = v.copy().sub(polyA.centroid).rotate(polyA.angle);
      return Vector2.add(rotated, polyA.pos);
    });
    
    const verticesB = polyB.vertices.map(v => {
      const rotated = v.copy().sub(polyB.centroid).rotate(polyB.angle);
      return Vector2.add(rotated, polyB.pos);
    });

    const axes = this.getAxes(verticesA).concat(this.getAxes(verticesB));
    let overlap = Infinity;
    let smallestAxis;

    for (const axis of axes) {
      const p1 = this.project(verticesA, axis);
      const p2 = this.project(verticesB, axis);

      if (!this.overlaps(p1, p2)) {
        return null;
      } else {
        const o = this.getOverlap(p1, p2);
        if (o < overlap) {
          overlap = o;
          smallestAxis = axis;
        }
      }
    }

    return { overlap, axis: smallestAxis };
  }

  getAxes(vertices) {
    const axes = [];
    for (let i = 0; i < vertices.length; i++) {
      const p1 = vertices[i];
      const p2 = vertices[(i + 1) % vertices.length];
      const edge = Vector2.sub(p1, p2);
      const normal = new Vector2(-edge.y, edge.x).normalize();
      axes.push(normal);
    }
    return axes;
  }

  project(vertices, axis) {
    let min = Vector2.dot(vertices[0], axis);
    let max = min;

    for (let i = 1; i < vertices.length; i++) {
      const p = Vector2.dot(vertices[i], axis);
      if (p < min) min = p;
      else if (p > max) max = p;
    }

    return { min, max };
  }

  overlaps(p1, p2) {
    return p1.max > p2.min && p2.max > p1.min;
  }

  getOverlap(p1, p2) {
    return Math.min(p1.max - p2.min, p2.max - p1.min);
  }

  resolveCollision(polyA, polyB, collisionInfo) {
    const mtv = collisionInfo.axis.copy().mult(collisionInfo.overlap);

    if (Vector2.dot(Vector2.sub(polyA.pos, polyB.pos), mtv) < 0) {
      mtv.mult(-1);
    }

    const totalMass = polyA.mass + polyB.mass;
    if (totalMass <= 0) return;
    
    const separationA = mtv.copy().mult(polyB.mass / totalMass * 0.5);
    const separationB = mtv.copy().mult(polyA.mass / totalMass * 0.5);

    polyA.pos.add(separationA);
    polyB.pos.sub(separationB);

    const rv = Vector2.sub(polyA.vel, polyB.vel);
    const velAlongNormal = Vector2.dot(rv, mtv.copy().normalize());

    if (velAlongNormal > 0) return;

    const e = 0.3;
    let j = -(1 + e) * velAlongNormal;
    const invMassSum = (1 / (polyA.mass || 1)) + (1 / (polyB.mass || 1));
    if (invMassSum <= 0) return;

    j /= invMassSum;

    const impulse = mtv.copy().normalize().mult(j);
    polyA.vel.add(impulse.copy().mult(1 / (polyA.mass || 1)));
    polyB.vel.sub(impulse.copy().mult(1 / (polyB.mass || 1)));

    polyA.vel.mult(0.98);
    polyB.vel.mult(0.98);

    const collisionPoint = Vector2.add(polyA.pos, polyB.pos).mult(0.5);
    const rA = Vector2.sub(collisionPoint, polyA.pos);
    const rB = Vector2.sub(collisionPoint, polyB.pos);

    const crossA = rA.x * impulse.y - rA.y * impulse.x;
    const crossB = rB.x * impulse.y - rB.y * impulse.x;
    
    if(polyA.mass > 0)
      polyA.angularVelocity += crossA * 0.01 / polyA.mass;
    if(polyB.mass > 0)
      polyB.angularVelocity -= crossB * 0.01 / polyB.mass;
  }
}