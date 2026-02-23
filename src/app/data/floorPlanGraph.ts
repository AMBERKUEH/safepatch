// ============================
// Floor Plan Graph Data Model
// ============================

// --- Types ---

export interface FloorNode {
    nodeId: string;
    x: number;
    y: number;
    z: number; // floor level
    type: 'junction' | 'room' | 'exit' | 'stairs' | 'doorway';
    label?: string;
}

export interface FloorEdge {
    edgeId: string;
    from: string;
    to: string;
    length: number;
    width: number;
    isStairs: boolean;
    baseCost: number;
    accessibilityFlag: boolean; // true = wheelchair-safe
}

export interface HazardZone {
    hazardId: string;
    type: 'fire' | 'smoke' | 'blocked';
    severity: number; // 0..1  (1 = fully on fire)
    affectedNodes: string[];
    propagationRate: number; // severity increase per tick on neighbors
    timestamp: number;
}

export interface UserProfile {
    wheelchair?: boolean;
    elderly?: boolean;
    injured?: boolean;
}

export interface FloorPlanGraph {
    nodes: FloorNode[];
    edges: FloorEdge[];
    hazards: HazardZone[];
    width: number;
    height: number;
}

// --- Helpers ---

export function getNode(nodes: FloorNode[], id: string): FloorNode | undefined {
    return nodes.find((n) => n.nodeId === id);
}

export function getEdgesFrom(edges: FloorEdge[], nodeId: string): FloorEdge[] {
    return edges.filter((e) => e.from === nodeId || e.to === nodeId);
}

export function getNeighborId(edge: FloorEdge, currentId: string): string {
    return edge.from === currentId ? edge.to : edge.from;
}

export function nodeDistance(a: FloorNode, b: FloorNode): number {
    return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
}

/** Get hazard severity at a specific node. Returns 0 if no hazard affects it. */
export function getNodeSeverity(hazards: HazardZone[], nodeId: string): number {
    let maxSeverity = 0;
    for (const h of hazards) {
        if (h.affectedNodes.includes(nodeId)) {
            maxSeverity = Math.max(maxSeverity, h.severity);
        }
    }
    return maxSeverity;
}

// --- Default Floor Plan ---
// A realistic office floor: 600×400 canvas
// 2 exits (main exit top-right, emergency exit bottom-left)
// Corridors, rooms, and junctions

export const DEFAULT_NODES: FloorNode[] = [
    // --- Exits ---
    { nodeId: 'exit1', x: 550, y: 50, z: 0, type: 'exit', label: 'Main Exit' },
    { nodeId: 'exit2', x: 50, y: 350, z: 0, type: 'exit', label: 'Emergency Exit' },

    // --- Main corridor (horizontal, top) ---
    { nodeId: 'n1', x: 100, y: 50, z: 0, type: 'junction' },
    { nodeId: 'n2', x: 200, y: 50, z: 0, type: 'junction' },
    { nodeId: 'n3', x: 300, y: 50, z: 0, type: 'junction' },
    { nodeId: 'n4', x: 400, y: 50, z: 0, type: 'junction' },
    { nodeId: 'n5', x: 500, y: 50, z: 0, type: 'junction' },

    // --- Second corridor (horizontal, middle) ---
    { nodeId: 'n6', x: 100, y: 200, z: 0, type: 'junction' },
    { nodeId: 'n7', x: 200, y: 200, z: 0, type: 'junction' },
    { nodeId: 'n8', x: 300, y: 200, z: 0, type: 'junction' },
    { nodeId: 'n9', x: 400, y: 200, z: 0, type: 'junction' },
    { nodeId: 'n10', x: 500, y: 200, z: 0, type: 'junction' },

    // --- Third corridor (horizontal, bottom) ---
    { nodeId: 'n11', x: 100, y: 350, z: 0, type: 'junction' },
    { nodeId: 'n12', x: 200, y: 350, z: 0, type: 'junction' },
    { nodeId: 'n13', x: 300, y: 350, z: 0, type: 'junction' },
    { nodeId: 'n14', x: 400, y: 350, z: 0, type: 'junction' },
    { nodeId: 'n15', x: 500, y: 350, z: 0, type: 'junction' },

    // --- Rooms (off corridors) ---
    { nodeId: 'r1', x: 150, y: 120, z: 0, type: 'room', label: 'Office A' },
    { nodeId: 'r2', x: 350, y: 120, z: 0, type: 'room', label: 'Office B' },
    { nodeId: 'r3', x: 150, y: 280, z: 0, type: 'room', label: 'Meeting Room' },
    { nodeId: 'r4', x: 350, y: 280, z: 0, type: 'room', label: 'Server Room' },
    { nodeId: 'r5', x: 500, y: 120, z: 0, type: 'room', label: 'Break Room' },

    // --- Stairs ---
    { nodeId: 's1', x: 50, y: 200, z: 0, type: 'stairs', label: 'Stairwell A' },

    // --- User default start ---
    { nodeId: 'start', x: 300, y: 300, z: 0, type: 'junction', label: 'You' },
];

function edge(id: string, from: string, to: string, extras?: Partial<FloorEdge>): FloorEdge {
    // We'll compute length dynamically based on node positions later,
    // but for the default graph pre-compute it.
    return {
        edgeId: id,
        from,
        to,
        length: 0, // will be computed
        width: extras?.width ?? 2.5,
        isStairs: extras?.isStairs ?? false,
        baseCost: 0, // will equal length
        accessibilityFlag: extras?.accessibilityFlag ?? true,
    };
}

const RAW_EDGES: FloorEdge[] = [
    // Top corridor
    edge('e1', 'n1', 'n2'),
    edge('e2', 'n2', 'n3'),
    edge('e3', 'n3', 'n4'),
    edge('e4', 'n4', 'n5'),
    edge('e5', 'n5', 'exit1'),

    // Middle corridor
    edge('e6', 'n6', 'n7'),
    edge('e7', 'n7', 'n8'),
    edge('e8', 'n8', 'n9'),
    edge('e9', 'n9', 'n10'),

    // Bottom corridor
    edge('e10', 'n11', 'n12'),
    edge('e11', 'n12', 'n13'),
    edge('e12', 'n13', 'n14'),
    edge('e13', 'n14', 'n15'),

    // Vertical connectors (left)
    edge('e14', 'n1', 'n6'),
    edge('e15', 'n6', 'n11'),

    // Vertical connectors (center-left)
    edge('e16', 'n2', 'n7'),
    edge('e17', 'n7', 'n12'),

    // Vertical connectors (center)
    edge('e18', 'n3', 'n8'),
    edge('e19', 'n8', 'n13'),

    // Vertical connectors (center-right)
    edge('e20', 'n4', 'n9'),
    edge('e21', 'n9', 'n14'),

    // Vertical connectors (right)
    edge('e22', 'n5', 'n10'),
    edge('e23', 'n10', 'n15'),

    // Exits
    edge('e24', 'n11', 'exit2'),

    // Room doorways
    edge('e25', 'n1', 'r1'),
    edge('e26', 'n2', 'r1'),
    edge('e27', 'n3', 'r2'),
    edge('e28', 'n4', 'r2'),
    edge('e29', 'n6', 'r3'),
    edge('e30', 'n7', 'r3'),
    edge('e31', 'n8', 'r4'),
    edge('e32', 'n9', 'r4'),
    edge('e33', 'n5', 'r5'),
    edge('e34', 'n10', 'r5'),

    // Stairs
    edge('e35', 'n6', 's1', { isStairs: true, accessibilityFlag: false }),

    // Start position connections (user starts near n13 / n8)
    edge('e36', 'start', 'n13'),
    edge('e37', 'start', 'n8'),
    edge('e38', 'start', 'r4'),
];

// Compute edge lengths from node positions
function computeEdgeLengths(nodes: FloorNode[], edges: FloorEdge[]): FloorEdge[] {
    return edges.map((e) => {
        const fromNode = nodes.find((n) => n.nodeId === e.from);
        const toNode = nodes.find((n) => n.nodeId === e.to);
        if (fromNode && toNode) {
            const len = Math.sqrt((toNode.x - fromNode.x) ** 2 + (toNode.y - fromNode.y) ** 2);
            return { ...e, length: len, baseCost: len };
        }
        return e;
    });
}

export const DEFAULT_EDGES: FloorEdge[] = computeEdgeLengths(DEFAULT_NODES, RAW_EDGES);

export const DEFAULT_HAZARDS: HazardZone[] = [
    {
        hazardId: 'h1',
        type: 'fire',
        severity: 0.8,
        affectedNodes: ['r2', 'n3'],
        propagationRate: 0.05,
        timestamp: Date.now(),
    },
];

export const DEFAULT_FLOORPLAN: FloorPlanGraph = {
    nodes: DEFAULT_NODES,
    edges: DEFAULT_EDGES,
    hazards: DEFAULT_HAZARDS,
    width: 600,
    height: 400,
};

// --- Wall segments for canvas rendering (cosmetic only) ---
export interface WallSegment {
    x1: number; y1: number;
    x2: number; y2: number;
}

export const WALL_SEGMENTS: WallSegment[] = [
    // Outer walls
    { x1: 10, y1: 10, x2: 590, y2: 10 },
    { x1: 590, y1: 10, x2: 590, y2: 390 },
    { x1: 590, y1: 390, x2: 10, y2: 390 },
    { x1: 10, y1: 390, x2: 10, y2: 10 },

    // Room walls: Office A
    { x1: 110, y1: 80, x2: 190, y2: 80 },
    { x1: 110, y1: 80, x2: 110, y2: 160 },
    { x1: 190, y1: 80, x2: 190, y2: 160 },

    // Room walls: Office B
    { x1: 310, y1: 80, x2: 390, y2: 80 },
    { x1: 310, y1: 80, x2: 310, y2: 160 },
    { x1: 390, y1: 80, x2: 390, y2: 160 },

    // Room walls: Meeting Room
    { x1: 110, y1: 240, x2: 190, y2: 240 },
    { x1: 110, y1: 240, x2: 110, y2: 320 },
    { x1: 190, y1: 240, x2: 190, y2: 320 },

    // Room walls: Server Room
    { x1: 310, y1: 240, x2: 390, y2: 240 },
    { x1: 310, y1: 240, x2: 310, y2: 320 },
    { x1: 390, y1: 240, x2: 390, y2: 320 },

    // Room walls: Break Room
    { x1: 460, y1: 80, x2: 540, y2: 80 },
    { x1: 460, y1: 80, x2: 460, y2: 160 },
    { x1: 540, y1: 80, x2: 540, y2: 160 },
];
