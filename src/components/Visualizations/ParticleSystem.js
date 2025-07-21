import Vector2 from './shared/Vector2';
import SpatialGrid from './shared/SpatialGrid';

const F2 = 0.5 * (Math.sqrt(3.0) - 1.0);
const G2 = (3.0 - Math.sqrt(3.0)) / 6.0;
const grad3 = new Float32Array([1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0, 1, 0, 1, -1, 0, 1, 1, 0, -1, -1, 0, -1, 0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1]);

class SimplexNoise {
  constructor(random = Math.random) {
    this.p = new Uint8Array(256);
    this.perm = new Uint8Array(512);
    this.permMod12 = new Uint8Array(512);
    for (let i = 0; i < 256; i++) {
      this.p[i] = i;
    }
    for (let i = 255; i > 0; i--) {
      const r = Math.floor(random() * (i + 1));
      const t = this.p[i];
      this.p[i] = this.p[r];
      this.p[r] = t;
    }
    for (let i = 0; i < 512; i++) {
      this.perm[i] = this.p[i & 255];
      this.permMod12[i] = this.perm[i] % 12;
    }
  }

  noise2D(x, y) {
    let n0 = 0, n1 = 0, n2 = 0;
    const s = (x + y) * F2;
    const i = Math.floor(x + s);
    const j = Math.floor(y + s);
    const t = (i + j) * G2;
    const X0 = i - t;
    const Y0 = j - t;
    const x0 = x - X0;
    const y0 = y - Y0;
    let i1, j1;
    if (x0 > y0) {
      i1 = 1; j1 = 0;
    } else {
      i1 = 0; j1 = 1;
    }
    const x1 = x0 - i1 + G2;
    const y1 = y0 - j1 + G2;
    const x2 = x0 - 1.0 + 2.0 * G2;
    const y2 = y0 - 1.0 + 2.0 * G2;
    const ii = i & 255;
    const jj = j & 255;
    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 >= 0) {
      t0 *= t0;
      const g = this.permMod12[(ii + this.perm[jj])] * 3;
      n0 = t0 * t0 * (grad3[g] * x0 + grad3[g + 1] * y0);
    }
    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 >= 0) {
      t1 *= t1;
      const g = this.permMod12[(ii + i1 + this.perm[jj + j1])] * 3;
      n1 = t1 * t1 * (grad3[g] * x1 + grad3[g + 1] * y1);
    }
    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 >= 0) {
      t2 *= t2;
      const g = this.permMod12[(ii + 1 + this.perm[jj + 1])] * 3;
      n2 = t2 * t2 * (grad3[g] * x2 + grad3[g + 1] * y2);
    }
    return 70.0 * (n0 + n1 + n2);
  }
}

class Particle {
  constructor(x, y, noiseGen) {
    this.pos = new Vector2(x, y);
    this.vel = new Vector2(0, 0);
    this.acc = new Vector2(0, 0);
    this.originalPos = new Vector2(x, y);
    this.maxSpeed = 10;
    this.noiseGen = noiseGen;
    
    // Using Voronoi Physics Engine
    this.mass = 1;
    this.angle = 0;
    this.angularVelocity = 0;
    this.angularDamping = 0.98;
    this.closestNeighbors = [];
  }

  applyForce(force) {
    this.acc.add(force.copy().div(this.mass));
  }

  update(params, flowField, canvasWidth, canvasHeight, gravity) {
    if (gravity) {
        this.applyForce(gravity.copy().mult(params.gravityStrength));
    }
    const springForce = Vector2.sub(this.originalPos, this.pos);
    springForce.mult(params.stiffness);
    this.applyForce(springForce);

    this.vel.add(this.acc);
    this.vel.mult(params.damping); // Apply damping after acceleration
    this.acc.mult(0);

    if (params.flowInfluence > 0 && flowField) {
      const flowVector = flowField.getFlowVector(this.pos.x, this.pos.y);
      const flowVel = flowVector.mult(params.flowSpeed);
      this.vel.lerp(flowVel, params.flowInfluence);
    }

    this.vel.limit(this.maxSpeed);
    this.pos.add(this.vel);
    
    this.angularVelocity *= this.angularDamping;
    this.angle += this.angularVelocity;

    this.checkBounds(canvasWidth, canvasHeight, gravity);
  }
  
  getCurlNoise(x, y) {
    const eps = 0.01; 
    const n1x = this.noiseGen.noise2D(x + eps, y);
    const n2x = this.noiseGen.noise2D(x - eps, y);
    const n1y = this.noiseGen.noise2D(x, y + eps);
    const n2y = this.noiseGen.noise2D(x, y - eps);

    const dx = (n1x - n2x) / (2 * eps);
    const dy = (n1y - n2y) / (2 * eps);

    return new Vector2(dy, -dx).mult(this.noiseGen.noise2D(x,y));
  }

  findClosestNeighbors(nearby, maxDistance, maxConnections) {
    this.closestNeighbors = [];
    const distances = [];
    
    for (const other of nearby) {
      if (other !== this) {
        const d = Vector2.dist(this.pos, other.pos);
        if (d < maxDistance) {
          distances.push({ particle: other, distance: d });
        }
      }
    }
    
    distances.sort((a, b) => a.distance - b.distance);
    this.closestNeighbors = distances.slice(0, maxConnections).map(d => d.particle);
  }

  checkBounds(width, height, gravity) {
    if (gravity) {
      const bounce = -0.8;
      if (this.pos.x > width) {
        this.pos.x = width;
        this.vel.x *= bounce;
      } else if (this.pos.x < 0) {
        this.pos.x = 0;
        this.vel.x *= bounce;
      }
      if (this.pos.y > height) {
        this.pos.y = height;
        this.vel.y *= bounce;
      } else if (this.pos.y < 0) {
        this.pos.y = 0;
        this.vel.y *= bounce;
      }
    } else {
      if (this.pos.x > width) this.pos.x = 0;
      if (this.pos.x < 0) this.pos.x = width;
      if (this.pos.y > height) this.pos.y = 0;
      if (this.pos.y < 0) this.pos.y = height;
    }
  }
}

export default class ParticleSystem {
  constructor(canvas, params, flowField) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.params = params;
    this.flowField = flowField;
    this.particles = [];
    this.spatialGrid = new SpatialGrid(50);
    this.noiseGen = new SimplexNoise();
  }
  
  async init() {
    await document.fonts.ready;
    this.createParticles();
  }

  reset() {
    for (const p of this.particles) {
      p.pos.x = p.originalPos.x;
      p.pos.y = p.originalPos.y;
      p.vel.mult(0);
    }
  }

  createParticles() {
    this.particles = [];
    const pg = document.createElement('canvas');
    pg.width = this.canvas.width;
    pg.height = this.canvas.height;
    const pgCtx = pg.getContext('2d');
    
    pgCtx.fillStyle = 'white';
    pgCtx.font = `bold ${this.params.fontSize}px ${this.params.fontFamily}`;
    pgCtx.textAlign = 'center';
    pgCtx.textBaseline = 'middle';
    pgCtx.letterSpacing = `${this.params.letterSpacing}px`;

    const lines = this.params.text.split('\n');
    const lineHeight = this.params.fontSize * this.params.lineHeight;
    const totalTextHeight = (lines.length - 1) * lineHeight;
    
    const centerX = pg.width / 2 + this.params.offsetX;
    const centerY = pg.height / 2 + this.params.offsetY;

    pgCtx.save();
    pgCtx.translate(centerX, centerY);
    pgCtx.scale(this.params.scaleX, this.params.scaleY);
    pgCtx.transform(1, 0, this.params.shear, 1, 0, 0);

    lines.forEach((line, index) => {
        const yPos = index * lineHeight - totalTextHeight / 2;
        pgCtx.fillText(line, 0, yPos);
    });
    pgCtx.restore();
    
    const imageData = pgCtx.getImageData(0, 0, pg.width, pg.height);
    const pixels = imageData.data;
    const step = Math.max(1, this.params.resolution);
    for (let x = 0; x < pg.width; x += step) {
      for (let y = 0; y < pg.height; y += step) {
        const index = (x + y * pg.width) * 4;
        if (pixels[index] > 128) {
          this.particles.push(new Particle(x, y, this.noiseGen));
        }
      }
    }
  }

  updateParams(newParams) {
    this.params = newParams;
  }
  
  update(mouse, interactionMode, gravity) {
    this.spatialGrid.clear();
    for (const particle of this.particles) {
      this.spatialGrid.add(particle);
    }
    
    for (const particle of this.particles) {
      if (interactionMode === 'repel' && mouse.isPressed) {
        const repelForce = Vector2.sub(particle.pos, new Vector2(mouse.x, mouse.y));
        const distSq = repelForce.magSq();
        if (distSq < this.params.repelRadius * this.params.repelRadius && distSq > 0) {
          repelForce.setMag(this.params.repelForce * 0.5); // Use setMag for consistent feel
          particle.applyForce(repelForce);
        }
      }
      
      if (this.params.showClosestLines) {
        const nearby = this.spatialGrid.getNearby(particle, this.params.closestSearchDistance);
        particle.findClosestNeighbors(nearby, this.params.closestSearchDistance, this.params.maxClosestConnections);
      }
      
      particle.update(this.params, this.flowField, this.canvas.width, this.canvas.height, gravity);
    }

    if (this.params.enableCollisions) {
      this.handleCollisions();
    }
  }

  handleCollisions() {
    for(const particle of this.particles) {
        const nearby = this.spatialGrid.getNearby(particle, this.params.particleSize * 2);
        for(const other of nearby) {
            if (particle === other) continue;
            
            const dist = Vector2.dist(particle.pos, other.pos);
            const requiredDist = this.params.particleSize * 2;

            if (dist < requiredDist && dist > 0) {
                const overlap = requiredDist - dist;
                const axis = Vector2.sub(particle.pos, other.pos).normalize();
                
                // Mass-based separation
                const totalMass = particle.mass + other.mass;
                particle.pos.add(axis.copy().mult(overlap * (other.mass / totalMass)));
                other.pos.sub(axis.copy().mult(overlap * (particle.mass / totalMass)));
                
                const rv = Vector2.sub(particle.vel, other.vel);
                const velAlongNormal = Vector2.dot(rv, axis);
                if (velAlongNormal > 0) continue;
                
                const e = 0.5; // Restitution
                let j = -(1 + e) * velAlongNormal;
                j /= (1 / particle.mass) + (1 / other.mass);
                
                const impulse = axis.mult(j);
                
                particle.vel.add(impulse.copy().div(particle.mass));
                other.vel.sub(impulse.copy().div(other.mass));
                
                particle.angularVelocity += 0.01 * j;
                other.angularVelocity -= 0.01 * j;
            }
        }
    }
  }


  draw(ctx) {
    if (this.params.showConnections) {
      this.drawPlexusConnections(ctx);
    }
    
    if (this.params.showClosestLines) {
      ctx.strokeStyle = this.params.particleColor;
      ctx.lineWidth = 0.5;
      
      for (const particle of this.particles) {
        for (const neighbor of particle.closestNeighbors) {
          ctx.beginPath();
          ctx.moveTo(particle.pos.x, particle.pos.y);
          ctx.lineTo(neighbor.pos.x, neighbor.pos.y);
          ctx.stroke();
        }
      }
    }
    
    if (this.params.useFill) {
      ctx.fillStyle = this.params.particleColor;
    } else {
      ctx.strokeStyle = this.params.particleColor;
      ctx.lineWidth = this.params.strokeWeight;
    }
    
    for (const p of this.particles) {
      ctx.save();
      ctx.translate(p.pos.x, p.pos.y);
      ctx.rotate(p.angle);
      
      ctx.beginPath();
      ctx.arc(0, 0, this.params.particleSize, 0, Math.PI * 2);
      
      if (this.params.useFill) {
        ctx.fill();
      } else {
        ctx.stroke();
      }
      
      ctx.beginPath();
      ctx.moveTo(0,0);
      ctx.lineTo(this.params.particleSize, 0);
      ctx.stroke();

      ctx.restore();
    }
  }

  drawPlexusConnections(ctx) {
    ctx.lineWidth = 0.5;
    const maxDistSq = this.params.connectionDistance * this.params.connectionDistance;
    
    for (const p1 of this.particles) {
      const nearby = this.spatialGrid.getNearby(p1, this.params.connectionDistance);
      const neighbors = [];
      
      for (const p2 of nearby) {
        if (p1 === p2) continue;
        const dx = p1.pos.x - p2.pos.x;
        const dy = p1.pos.y - p2.pos.y;
        const dSq = dx * dx + dy * dy;
        
        if (dSq < maxDistSq) {
          neighbors.push({ particle: p2, distance: dSq });
        }
      }
      
      neighbors.sort((a, b) => a.distance - b.distance);
      const connections = neighbors.slice(0, 2);
      
      for (const neighbor of connections) {
        const d = Math.sqrt(neighbor.distance);
        const alpha = this.map(d, 0, this.params.connectionDistance, 150, 0);
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha / 255})`;
        ctx.beginPath();
        ctx.moveTo(p1.pos.x, p1.pos.y);
        ctx.lineTo(neighbor.particle.pos.x, neighbor.particle.pos.y);
        ctx.stroke();
      }
    }
  }

  map(value, start1, stop1, start2, stop2) {
    return start2 + (stop2 - start2) * ((value - start1) / (stop1 - start1));
  }
}