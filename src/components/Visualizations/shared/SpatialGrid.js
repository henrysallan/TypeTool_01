export default class SpatialGrid {
  constructor(cellSize) {
    this.cellSize = cellSize;
    this.grid = new Map();
  }

  clear() {
    this.grid.clear();
  }

  getKey(x, y) {
    return `${Math.floor(x / this.cellSize)},${Math.floor(y / this.cellSize)}`;
  }

  add(item) {
    const key = this.getKey(item.pos.x, item.pos.y);
    if (!this.grid.has(key)) {
      this.grid.set(key, []);
    }
    this.grid.get(key).push(item);
  }

  getNearby(item, radius) {
    const nearby = [];
    const gridRadius = Math.ceil(radius / this.cellSize);
    
    for (let dx = -gridRadius; dx <= gridRadius; dx++) {
      for (let dy = -gridRadius; dy <= gridRadius; dy++) {
        const key = `${Math.floor(item.pos.x / this.cellSize) + dx},${Math.floor(item.pos.y / this.cellSize) + dy}`;
        if (this.grid.has(key)) {
          nearby.push(...this.grid.get(key));
        }
      }
    }
    
    return nearby;
  }
}