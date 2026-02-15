// A* Pathfinding Algorithm for emergency evacuation

export interface Point {
  x: number;
  y: number;
}

export interface Node {
  x: number;
  y: number;
  g: number; // cost from start
  h: number; // heuristic to end
  f: number; // total cost
  parent: Node | null;
}

export interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'wall' | 'fire' | 'smoke' | 'blocked';
}

// Heuristic function (Euclidean distance)
function heuristic(a: Point, b: Point): number {
  return Math.sqrt(Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2));
}

// Check if a point collides with any obstacle
function isBlocked(x: number, y: number, obstacles: Obstacle[], gridSize: number): boolean {
  for (const obstacle of obstacles) {
    if (
      x >= obstacle.x &&
      x < obstacle.x + obstacle.width &&
      y >= obstacle.y &&
      y < obstacle.y + obstacle.height
    ) {
      return true;
    }
  }
  return false;
}

// Get neighbors for a node
function getNeighbors(
  node: Node,
  gridWidth: number,
  gridHeight: number,
  obstacles: Obstacle[],
  gridSize: number
): Point[] {
  const neighbors: Point[] = [];
  const directions = [
    { x: 0, y: -gridSize }, // up
    { x: gridSize, y: 0 }, // right
    { x: 0, y: gridSize }, // down
    { x: -gridSize, y: 0 }, // left
    { x: gridSize, y: -gridSize }, // diagonal up-right
    { x: gridSize, y: gridSize }, // diagonal down-right
    { x: -gridSize, y: gridSize }, // diagonal down-left
    { x: -gridSize, y: -gridSize }, // diagonal up-left
  ];

  for (const dir of directions) {
    const newX = node.x + dir.x;
    const newY = node.y + dir.y;

    if (
      newX >= 0 &&
      newX < gridWidth &&
      newY >= 0 &&
      newY < gridHeight &&
      !isBlocked(newX, newY, obstacles, gridSize)
    ) {
      neighbors.push({ x: newX, y: newY });
    }
  }

  return neighbors;
}

// A* pathfinding algorithm
export function findPath(
  start: Point,
  end: Point,
  gridWidth: number,
  gridHeight: number,
  obstacles: Obstacle[],
  gridSize: number = 10
): Point[] {
  // Snap to grid
  const startNode: Node = {
    x: Math.round(start.x / gridSize) * gridSize,
    y: Math.round(start.y / gridSize) * gridSize,
    g: 0,
    h: heuristic(start, end),
    f: 0,
    parent: null,
  };
  startNode.f = startNode.g + startNode.h;

  const endPoint = {
    x: Math.round(end.x / gridSize) * gridSize,
    y: Math.round(end.y / gridSize) * gridSize,
  };

  const openSet: Node[] = [startNode];
  const closedSet = new Set<string>();

  while (openSet.length > 0) {
    // Find node with lowest f score
    openSet.sort((a, b) => a.f - b.f);
    const current = openSet.shift()!;

    // Check if we reached the goal
    if (current.x === endPoint.x && current.y === endPoint.y) {
      const path: Point[] = [];
      let temp: Node | null = current;
      while (temp) {
        path.unshift({ x: temp.x, y: temp.y });
        temp = temp.parent;
      }
      return path;
    }

    closedSet.add(`${current.x},${current.y}`);

    // Check neighbors
    const neighbors = getNeighbors(current, gridWidth, gridHeight, obstacles, gridSize);

    for (const neighborPos of neighbors) {
      const key = `${neighborPos.x},${neighborPos.y}`;
      if (closedSet.has(key)) continue;

      const gScore = current.g + heuristic(current, neighborPos);
      const hScore = heuristic(neighborPos, endPoint);
      const fScore = gScore + hScore;

      const existingNode = openSet.find((n) => n.x === neighborPos.x && n.y === neighborPos.y);

      if (existingNode) {
        if (gScore < existingNode.g) {
          existingNode.g = gScore;
          existingNode.f = fScore;
          existingNode.parent = current;
        }
      } else {
        openSet.push({
          x: neighborPos.x,
          y: neighborPos.y,
          g: gScore,
          h: hScore,
          f: fScore,
          parent: current,
        });
      }
    }
  }

  // No path found
  return [];
}

// Simplify path by removing unnecessary intermediate points
export function smoothPath(path: Point[]): Point[] {
  if (path.length <= 2) return path;

  const smoothed: Point[] = [path[0]];
  
  for (let i = 1; i < path.length - 1; i++) {
    const prev = path[i - 1];
    const current = path[i];
    const next = path[i + 1];

    // Calculate direction vectors
    const dir1 = { x: current.x - prev.x, y: current.y - prev.y };
    const dir2 = { x: next.x - current.x, y: next.y - current.y };

    // If direction changes significantly, keep the point
    if (dir1.x !== dir2.x || dir1.y !== dir2.y) {
      smoothed.push(current);
    }
  }

  smoothed.push(path[path.length - 1]);
  return smoothed;
}
