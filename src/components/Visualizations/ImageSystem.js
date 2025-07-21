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
  }

  applyForce(force) {
    this.acc.add(force);
  }

  repelFrom(x, y, radius, strength) {
    const dx = this.pos.x - x;
    const dy = this.pos.y - y;
    const dSq = dx * dx + dy * dy;
    
    if (dSq < radius * radius && dSq > 0) {
      const d = Math.sqrt(dSq);
      const repel = new Vector2(dx, dy);
      repel.normalize();
      const force = strength * (1 - d / radius);
      repel.mult(force);
      this.applyForce(repel);
    }
  }

  update(params, flowField, canvasWidth, canvasHeight, gravity) {
    if (gravity) {
            this.applyForce(gravity.copy().mult(params.gravityStrength));
        }
    
    const springForce = Vector2.sub(this.originalPos, this.pos);
    springForce.mult(params.stiffness);
    this.applyForce(springForce);

    const damping = Vector2.mult(this.vel, -params.damping);
    this.applyForce(damping);

    let physicsVel = Vector2.add(this.vel, this.acc);
    this.acc.mult(0);

    if (params.flowInfluence > 0 && flowField) {
      const flowVector = flowField.getFlowVector(this.pos.x, this.pos.y);
      const flowVel = flowVector.mult(params.flowSpeed);
      physicsVel = Vector2.lerp(physicsVel, flowVel, params.flowInfluence);
    }

    this.vel = physicsVel;
    this.vel.limit(this.maxSpeed);
    this.pos.add(this.vel);
    
    this.checkBounds(canvasWidth, canvasHeight);
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
    this.createParticles();
  }
  reset() {
    for (const p of this.particles) {
      p.pos.x = p.originalPos.x;
      p.pos.y = p.originalPos.y;
      p.vel.mult(0);
    }
  }

  updateParams(newShared, newImage) {
    this.sharedParams = newShared;
    this.imageParams = newImage;
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

  update(mouse, interactionMode) {
    this.spatialGrid.clear();
    for (const p of this.particles) this.spatialGrid.add(p);
    
    for (const p of this.particles) {
       if (interactionMode === 'repel' && mouse.isPressed) {
        p.repelFrom(mouse.x, mouse.y, this.sharedParams.repelRadius, this.sharedParams.repelForce);
      }
      if (this.sharedParams.showClosestLines) {
        const nearby = this.spatialGrid.getNearby(p, this.sharedParams.closestSearchDistance);
        p.findClosestNeighbors(nearby, this.sharedParams.closestSearchDistance, this.sharedParams.maxClosestConnections);
      }
      p.update(this.sharedParams, this.flowField, this.canvas.width, this.canvas.height, gravity);
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
      if (this.imageParams.renderMode === 'ASCII') {
        ctx.fillText(p.char, p.pos.x, p.pos.y);
      } else {
        ctx.beginPath();
        const size = this.imageParams.renderMode === 'Circles' ? p.size / 2 : this.sharedParams.particleSize;
        ctx.arc(p.pos.x, p.pos.y, size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    
    if (this.sharedParams.showClosestLines) {
      ctx.strokeStyle = this.sharedParams.particleColor;
      ctx.lineWidth = 0.5;
      for (const p of this.particles) {
        for (const neighbor of p.closestNeighbors) {
          ctx.beginPath();
          ctx.moveTo(p.pos.x, p.pos.y);
          ctx.lineTo(neighbor.pos.x, neighbor.pos.y);
          ctx.stroke();
        }
      }
    }
  }
}