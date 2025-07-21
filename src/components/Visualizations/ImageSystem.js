import Vector2 from './shared/Vector2';
import SpatialGrid from './shared/SpatialGrid';

class ImageParticle {
  constructor(x, y) {
    this.pos = new Vector2(x, y);
    this.vel = new Vector2(0, 0);
    this.acc = new Vector2(0, 0);
    this.originalPos = new Vector2(x, y);
    this.maxSpeed = 10;
    this.closestNeighbors = [];
    this.char = ''; 
    this.size = 1; 
    
    // Using Voronoi Physics Engine
    this.mass = 1;
    this.angle = 0;
    this.angularVelocity = 0;
    this.angularDamping = 0.98;
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
    this.vel.mult(params.damping);
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
      if (this.pos.x > width - this.size || this.pos.x < this.size) {
        this.vel.x *= -0.8;
        this.pos.x = Math.max(this.size, Math.min(width - this.size, this.pos.x));
      }
      if (this.pos.y > height - this.size || this.pos.y < this.size) {
        this.vel.y *= -0.8;
        this.pos.y = Math.max(this.size, Math.min(height - this.size, this.pos.y));
      }
    } else { // Wrap around
      if (this.pos.x > width) this.pos.x = 0;
      if (this.pos.x < 0) this.pos.x = width;
      if (this.pos.y > height) this.pos.y = 0;
      if (this.pos.y < 0) this.pos.y = height;
    }
  }
}

export default class ImageSystem {
  constructor(canvas, imageParams, sharedParams, flowField) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.imageParams = imageParams;
    this.sharedParams = sharedParams;
    this.flowField = flowField;
    this.particles = [];
    this.spatialGrid = new SpatialGrid(50);
    
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
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = this.imageParams.imageUrl

    img.onload = () => {
      const mosaicSize = this.imageParams.resolution;
      const pg = document.createElement('canvas');
      const pgCtx = pg.getContext('2d');
      pg.width = this.canvas.width;
      pg.height = this.canvas.height;
      
      const canvasAspectRatio = pg.width / pg.height;
      const imgAspectRatio = img.width / img.height;
      let renderW, renderH, renderX, renderY;

      if (canvasAspectRatio > imgAspectRatio) {
        renderH = pg.height * this.imageParams.scale;
        renderW = img.width * (renderH / img.height);
      } else {
        renderW = pg.width * this.imageParams.scale;
        renderH = img.height * (renderW / img.width);
      }

      renderX = (pg.width - renderW) / 2 + this.imageParams.offsetX;
      renderY = (pg.height - renderH) / 2 + this.imageParams.offsetY;

      pgCtx.drawImage(img, renderX, renderY, renderW, renderH);
      const imageData = pgCtx.getImageData(0, 0, pg.width, pg.height).data;

      for (let y = 0; y < pg.height; y += mosaicSize) {
        for (let x = 0; x < pg.width; x += mosaicSize) {
          const index = (x + y * pg.width) * 4;
          const r = imageData[index];
          const g = imageData[index + 1];
          const b = imageData[index + 2];
          const brightness = (r + g + b) / 3 / 255; 
          
          const centerX = x + mosaicSize / 2;
          const centerY = y + mosaicSize / 2;

          if (this.imageParams.renderMode === 'Circles') {
            const p = new ImageParticle(centerX, centerY);
            p.size = brightness * mosaicSize * 0.8;
            if (p.size > 1) {
              this.particles.push(p);
            }
          } else if (this.imageParams.renderMode === 'ASCII') {
            const patternSet = {
              'Standard': '`.-:_,^=;><+!rc*z?sLTv)J7(|Fi{C}fI31tlu[neoZ5Yxjya]2ESwqkP6h9d4VpOGbUAKXHm8RD#$Bg0MNWQ%&@',
              'Blocks': ' ░▒▓█',
              'Complex': '█▇▆▅▄▃▂ '
            };
            const chars = patternSet[this.imageParams.asciiPattern] || patternSet['Standard'];
            const charIndex = Math.floor(brightness * (chars.length - 1));
            const p = new ImageParticle(centerX, centerY);
            p.char = chars[charIndex];
            this.particles.push(p);
          } else if (this.imageParams.renderMode === 'Dither') {
            const ditherLevel = Math.round(brightness * 4);
            const ditherPatterns = [
              [],
              [[0.25, 0.25]],
              [[0.25, 0.25], [0.75, 0.75]],
              [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75]],
              [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]]
            ];
            ditherPatterns[ditherLevel].forEach(offset => {
              const ditherX = x + offset[0] * mosaicSize;
              const ditherY = y + offset[1] * mosaicSize;
              this.particles.push(new ImageParticle(ditherX, ditherY));
            });
          }
        }
      }
    };
    img.onerror = () => {
      console.error("Failed to load image from URL:", this.imageParams.imageUrl);
    }
  }

  updateParams(newShared, newImage) {
    this.sharedParams = newShared;
    this.imageParams = newImage;
  }

  update(mouse, interactionMode, gravity) {
    this.spatialGrid.clear();
    for (const p of this.particles) this.spatialGrid.add(p);
    
    for (const p of this.particles) {
      if (interactionMode === 'repel' && mouse.isPressed) {
        const repelForce = Vector2.sub(p.pos, new Vector2(mouse.x, mouse.y));
        const distSq = repelForce.magSq();
        if (distSq < this.sharedParams.repelRadius * this.sharedParams.repelRadius && distSq > 0) {
          repelForce.setMag(this.sharedParams.repelForce * 0.5);
          p.applyForce(repelForce);
        }
      }
      if (this.sharedParams.showClosestLines) {
        const nearby = this.spatialGrid.getNearby(p, this.sharedParams.closestSearchDistance);
        p.findClosestNeighbors(nearby, this.sharedParams.closestSearchDistance, this.sharedParams.maxClosestConnections);
      }
      p.update(this.sharedParams, this.flowField, this.canvas.width, this.canvas.height, gravity);
    }
    if (this.sharedParams.enableCollisions) {
        this.handleCollisions();
    }
  }

  handleCollisions() {
    for(const particle of this.particles) {
        const pSize = this.imageParams.renderMode === 'Circles' ? particle.size / 2 : this.sharedParams.particleSize;
        const nearby = this.spatialGrid.getNearby(particle, pSize * 2);

        for(const other of nearby) {
            if (particle === other) continue;
            
            const oSize = this.imageParams.renderMode === 'Circles' ? other.size / 2 : this.sharedParams.particleSize;
            const requiredDist = pSize + oSize;
            const dist = Vector2.dist(particle.pos, other.pos);

            if (dist < requiredDist && dist > 0) {
                const overlap = requiredDist - dist;
                const axis = Vector2.sub(particle.pos, other.pos).normalize();
                
                const totalMass = particle.mass + other.mass;
                particle.pos.add(axis.copy().mult(overlap * (other.mass / totalMass)));
                other.pos.sub(axis.copy().mult(overlap * (particle.mass / totalMass)));
                
                const rv = Vector2.sub(particle.vel, other.vel);
                const velAlongNormal = Vector2.dot(rv, axis);
                if (velAlongNormal > 0) continue;
                
                const e = 0.5;
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
    ctx.fillStyle = this.sharedParams.particleColor;
    
    if (this.imageParams.renderMode === 'ASCII') {
      ctx.font = `${this.imageParams.resolution * 1.5}px ${this.sharedParams.fontFamily}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
    }

    for (const p of this.particles) {
        ctx.save();
        ctx.translate(p.pos.x, p.pos.y);
        ctx.rotate(p.angle);

        if (this.imageParams.renderMode === 'ASCII') {
            ctx.fillText(p.char, 0, 0);
        } else {
            ctx.beginPath();
            const size = this.imageParams.renderMode === 'Circles' ? p.size / 2 : this.sharedParams.particleSize;
            ctx.arc(0, 0, size, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.beginPath();
            ctx.moveTo(0,0);
            ctx.lineTo(size, 0);
            ctx.strokeStyle = this.sharedParams.backgroundColor;
            ctx.lineWidth = 1;
            ctx.stroke();
        }
        ctx.restore();
    }
  }
}