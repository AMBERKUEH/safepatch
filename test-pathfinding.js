import { findGraphPath } from './src/app/utils/pathfinding.ts';
import { DEFAULT_NODES, DEFAULT_EDGES } from './src/app/data/floorPlanGraph.ts';

// Mock hazards
const hazards = [
    {
        hazardId: 'test-fire',
        type: 'fire',
        severity: 1.0,
        affectedNodes: ['n3'], // Block n3 (middle of top corridor)
        propagationRate: 0,
        timestamp: Date.now()
    }
];

const EXIT_IDS = ['exit1', 'exit2'];

console.log('--- Pathfinding Test ---');

// Test 1: Route to exit1 with n3 blocked
console.log('\nTest 1: Route from start to Exit 1 (Main Exit) with n3 blocked by fire');
const result1 = findGraphPath('start', ['exit1'], DEFAULT_NODES, DEFAULT_EDGES, hazards);
if (result1) {
    console.log('✅ Path found!');
    console.log('Exit Used:', result1.exitUsed);
    console.log('Path:', result1.path.map(n => n.nodeId).join(' -> '));
    console.log('Safety Score:', result1.safetyScore.toFixed(2));

    const containsN3 = result1.path.some(n => n.nodeId === 'n3');
    console.log('Avoided n3 (hazard)?', !containsN3 ? '✅ YES' : '❌ NO');
} else {
    console.log('❌ No path found');
}

// Test 2: Wheelchair accessibility
console.log('\nTest 2: Route from s1 (stairs) for wheelchair user');
const result2 = findGraphPath('s1', ['exit1'], DEFAULT_NODES, DEFAULT_EDGES, [], { wheelchair: true });
if (result2) {
    console.log('❌ Error: Path found through stairs for wheelchair user');
} else {
    console.log('✅ Correct: No wheelchair-accessible path from stairwell node s1');
}

// Test 3: Standard route to nearest exit
console.log('\nTest 3: Standard route from start to nearest exit (no hazards)');
const result3 = findGraphPath('start', EXIT_IDS, DEFAULT_NODES, DEFAULT_EDGES, []);
if (result3) {
    console.log('✅ Path found!');
    console.log('Nearest Exit:', result3.exitUsed === 'exit2' ? 'Emergency Exit (Lower Left)' : 'Main Exit (Upper Right)');
    console.log('Path Length:', result3.path.length, 'nodes');
}

console.log('\n--- End of Tests ---');
