// A* Pathfinding Algorithm for emergency evacuation

import type {
  FloorNode,
  FloorEdge,
  HazardZone,
  UserProfile,
} from '../data/floorPlanGraph';
import { getEdgesFrom, getNeighborId, getNode, getNodeSeverity, nodeDistance } from '../data/floorPlanGraph';

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

// =============================================
// Graph-Based A* Pathfinding (Person 2 upgrade)
// =============================================

export interface TurnInstruction {
  atNodeId: string;
  direction: 'LEFT' | 'RIGHT' | 'STRAIGHT' | 'UP' | 'DOWN';
  distanceToNext: number; // meters (pixels / 10)
}

export interface GraphPathResult {
  path: FloorNode[];
  totalCost: number;
  safetyScore: number; // average hazard severity along path (0 = safe, 1 = dangerous)
  turns: TurnInstruction[];
  exitUsed: string;
}

const HAZARD_WEIGHT = 20;
const BLOCK_THRESHOLD = 0.7;

function computeEdgeWeight(
  edge: FloorEdge,
  fromSeverity: number,
  toSeverity: number,
  userProfile: UserProfile,
  _congestion: number = 0
): number {
  const maxSeverity = Math.max(fromSeverity, toSeverity);
  if (maxSeverity > BLOCK_THRESHOLD) return Infinity;
  if (edge.isStairs && userProfile.wheelchair) return Infinity;

  const hazardPenalty = edge.length * HAZARD_WEIGHT * maxSeverity;
  const congestionPenalty = _congestion;
  const elderlyPenalty = userProfile.elderly ? edge.length * 0.3 : 0;

  return edge.baseCost + hazardPenalty + congestionPenalty + elderlyPenalty;
}


/**
 * Graph-based A* pathfinding with hazard-weighted edges.
 * Supports multiple goal nodes (exits) — returns path to best exit.
 */
export function findGraphPath(
  startNodeId: string,
  goalNodeIds: string[],
  nodes: FloorNode[],
  edges: FloorEdge[],
  hazards: HazardZone[],
  userProfile: UserProfile = {},
  congestionMap: Record<string, number> = {}
): GraphPathResult | null {
  const startNode = getNode(nodes, startNodeId);
  if (!startNode) return null;

  let bestResult: GraphPathResult | null = null;

  for (const goalId of goalNodeIds) {
    const goalNode = getNode(nodes, goalId);
    if (!goalNode) continue;

    const result = astarClean(startNode, goalNode, nodes, edges, hazards, userProfile, congestionMap);
    if (result && (!bestResult || result.totalCost < bestResult.totalCost)) {
      bestResult = { ...result, exitUsed: goalId };
    }
  }

  return bestResult;
}

function astarClean(
  start: FloorNode,
  goal: FloorNode,
  nodes: FloorNode[],
  edges: FloorEdge[],
  hazards: HazardZone[],
  userProfile: UserProfile,
  congestionMap: Record<string, number>
): Omit<GraphPathResult, 'exitUsed'> | null {
  const gScore = new Map<string, number>();
  const fScore = new Map<string, number>();
  const cameFrom = new Map<string, string>();
  const openSet = new Set<string>();
  const closedSet = new Set<string>();

  const h = (nId: string) => {
    const n = getNode(nodes, nId);
    return n ? nodeDistance(n, goal) : Infinity;
  };

  gScore.set(start.nodeId, 0);
  fScore.set(start.nodeId, h(start.nodeId));
  openSet.add(start.nodeId);

  while (openSet.size > 0) {
    // Find node with lowest f score
    let currentId: string | null = null;
    let currentF = Infinity;
    for (const id of openSet) {
      const f = fScore.get(id) ?? Infinity;
      if (f < currentF) {
        currentF = f;
        currentId = id;
      }
    }
    if (!currentId) break;

    // Reached goal?
    if (currentId === goal.nodeId) {
      // Reconstruct path
      const pathIds: string[] = [];
      let trace: string | undefined = currentId;
      while (trace) {
        pathIds.unshift(trace);
        trace = cameFrom.get(trace);
      }

      const pathNodes = pathIds
        .map((id) => getNode(nodes, id))
        .filter((n): n is FloorNode => n !== undefined);

      // Calculate safety score
      let totalSeverity = 0;
      for (const n of pathNodes) {
        totalSeverity += getNodeSeverity(hazards, n.nodeId);
      }
      const safetyScore = pathNodes.length > 0 ? totalSeverity / pathNodes.length : 0;

      // Calculate turns
      const turns = getTurnDirections(pathNodes);

      return {
        path: pathNodes,
        totalCost: gScore.get(currentId) ?? 0,
        safetyScore,
        turns,
      };
    }

    openSet.delete(currentId);
    closedSet.add(currentId);

    // Expand neighbors
    const neighborEdges = getEdgesFrom(edges, currentId);
    for (const edge of neighborEdges) {
      const neighborId = getNeighborId(edge, currentId);
      if (closedSet.has(neighborId)) continue;

      const fromSeverity = getNodeSeverity(hazards, currentId);
      const toSeverity = getNodeSeverity(hazards, neighborId);
      const congestion = congestionMap[edge.edgeId] || 0;

      const weight = computeEdgeWeight(edge, fromSeverity, toSeverity, userProfile, congestion);
      if (weight === Infinity) continue;

      const tentativeG = (gScore.get(currentId) ?? Infinity) + weight;
      const existingG = gScore.get(neighborId) ?? Infinity;

      if (tentativeG < existingG) {
        cameFrom.set(neighborId, currentId);
        gScore.set(neighborId, tentativeG);
        fScore.set(neighborId, tentativeG + h(neighborId));
        openSet.add(neighborId);
      }
    }
  }

  return null;
}

/**
 * Compute turn-by-turn directions from a path of FloorNodes.
 */
export function getTurnDirections(pathNodes: FloorNode[]): TurnInstruction[] {
  const turns: TurnInstruction[] = [];
  if (pathNodes.length < 2) return turns;

  for (let i = 1; i < pathNodes.length - 1; i++) {
    const prev = pathNodes[i - 1];
    const curr = pathNodes[i];
    const next = pathNodes[i + 1];

    const angle1 = Math.atan2(curr.y - prev.y, curr.x - prev.x);
    const angle2 = Math.atan2(next.y - curr.y, next.x - curr.x);

    let diff = angle2 - angle1;
    // Normalize to [-PI, PI]
    while (diff > Math.PI) diff -= 2 * Math.PI;
    while (diff < -Math.PI) diff += 2 * Math.PI;

    let direction: TurnInstruction['direction'] = 'STRAIGHT';
    if (diff > 0.3) direction = 'RIGHT';
    else if (diff < -0.3) direction = 'LEFT';
    else if (next.y < curr.y - 20) direction = 'UP';
    else if (next.y > curr.y + 20) direction = 'DOWN';

    if (direction !== 'STRAIGHT') {
      const dist = nodeDistance(curr, next) / 10; // px to meters
      turns.push({
        atNodeId: curr.nodeId,
        direction,
        distanceToNext: Math.round(dist * 10) / 10,
      });
    }
  }

  return turns;
}

/**
 * Find the nearest node to a given (x,y) position.
 */
export function findNearestNode(x: number, y: number, nodes: FloorNode[]): FloorNode | null {
  let best: FloorNode | null = null;
  let bestDist = Infinity;
  for (const n of nodes) {
    const d = Math.sqrt((n.x - x) ** 2 + (n.y - y) ** 2);
    if (d < bestDist) {
      bestDist = d;
      best = n;
    }
  }
  return best;
}
