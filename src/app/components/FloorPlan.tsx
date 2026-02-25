import { useEffect, useRef, useCallback } from 'react';
import { motion } from 'motion/react';
import type { FloorNode, FloorEdge, HazardZone, WallSegment } from '../data/floorPlanGraph';
import { getNodeSeverity } from '../data/floorPlanGraph';

interface FloorPlanProps {
  nodes: FloorNode[];
  edges: FloorEdge[];
  hazards: HazardZone[];
  walls: WallSegment[];
  pathNodes: FloorNode[];      // computed route
  userNodeId: string;           // current user position node
  exitNodeIds: string[];
  onNodeClick?: (nodeId: string) => void;
  onAddHazard?: (nodeId: string) => void;
  width?: number;
  height?: number;
}

export function FloorPlan({
  nodes,
  edges,
  hazards,
  walls,
  pathNodes,
  userNodeId,
  exitNodeIds,
  onNodeClick,
  onAddHazard,
  width = 600,
  height = 400,
}: FloorPlanProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrame = useRef(0);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    animFrame.current++;

    // --- Background ---
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(0, 0, width, height);

    // --- Grid ---
    ctx.strokeStyle = '#e8e8e8';
    ctx.lineWidth = 0.5;
    for (let x = 0; x < width; x += 20) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
    }
    for (let y = 0; y < height; y += 20) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
    }

    // --- Walls ---
    ctx.strokeStyle = '#9e9e9e';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    for (const w of walls) {
      ctx.beginPath();
      ctx.moveTo(w.x1, w.y1);
      ctx.lineTo(w.x2, w.y2);
      ctx.stroke();
    }

    // --- Edges (corridors) ---
    ctx.strokeStyle = '#d0d0d0';
    ctx.lineWidth = 2;
    ctx.setLineDash([]);
    for (const edge of edges) {
      const from = nodes.find((n) => n.nodeId === edge.from);
      const to = nodes.find((n) => n.nodeId === edge.to);
      if (!from || !to) continue;

      // Color based on hazard severity on endpoints
      const sev = Math.max(
        getNodeSeverity(hazards, edge.from),
        getNodeSeverity(hazards, edge.to)
      );
      if (sev > 0.7) {
        ctx.strokeStyle = '#f44336';
        ctx.lineWidth = 3;
      } else if (sev > 0.3) {
        ctx.strokeStyle = '#ff9800';
        ctx.lineWidth = 2;
      } else {
        ctx.strokeStyle = '#d0d0d0';
        ctx.lineWidth = 2;
      }

      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
    }

    // --- Hazard zones (pulsing circles) ---
    for (const h of hazards) {
      for (const nId of h.affectedNodes) {
        const node = nodes.find((n) => n.nodeId === nId);
        if (!node) continue;

        const pulse = Math.sin(animFrame.current * 0.05) * 0.2 + 0.8;
        const radius = 25 + h.severity * 15;

        // Outer glow
        const gradient = ctx.createRadialGradient(
          node.x, node.y, 0,
          node.x, node.y, radius * 1.5
        );
        if (h.type === 'fire') {
          gradient.addColorStop(0, `rgba(255, 87, 34, ${0.6 * pulse})`);
          gradient.addColorStop(1, 'rgba(255, 87, 34, 0)');
        } else if (h.type === 'smoke') {
          gradient.addColorStop(0, `rgba(117, 117, 117, ${0.5 * pulse})`);
          gradient.addColorStop(1, 'rgba(117, 117, 117, 0)');
        } else {
          gradient.addColorStop(0, `rgba(244, 67, 54, ${0.5 * pulse})`);
          gradient.addColorStop(1, 'rgba(244, 67, 54, 0)');
        }
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius * 1.5, 0, Math.PI * 2);
        ctx.fill();

        // Inner circle
        ctx.fillStyle = h.type === 'fire'
          ? `rgba(255, 87, 34, ${0.7 * pulse})`
          : h.type === 'smoke'
            ? `rgba(117, 117, 117, ${0.5 * pulse})`
            : `rgba(244, 67, 54, ${0.5 * pulse})`;
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
        ctx.fill();

        // Emoji
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(h.type === 'fire' ? '🔥' : h.type === 'smoke' ? '💨' : '⛔', node.x, node.y);
      }
    }

    // --- Path (blue dashed line) ---
    if (pathNodes.length > 1) {
      ctx.strokeStyle = '#2196F3';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.setLineDash([10, 5]);
      ctx.beginPath();
      ctx.moveTo(pathNodes[0].x, pathNodes[0].y);
      for (let i = 1; i < pathNodes.length; i++) {
        ctx.lineTo(pathNodes[i].x, pathNodes[i].y);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      // Direction arrows along path
      for (let i = 0; i < pathNodes.length - 1; i++) {
        const start = pathNodes[i];
        const end = pathNodes[i + 1];
        const angle = Math.atan2(end.y - start.y, end.x - start.x);
        const midX = (start.x + end.x) / 2;
        const midY = (start.y + end.y) / 2;

        ctx.save();
        ctx.translate(midX, midY);
        ctx.rotate(angle);
        ctx.fillStyle = '#2196F3';
        ctx.beginPath();
        ctx.moveTo(10, 0);
        ctx.lineTo(-5, -7);
        ctx.lineTo(-5, 7);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    }

    // --- Nodes ---
    for (const node of nodes) {
      const isExit = exitNodeIds.includes(node.nodeId);
      const isUser = node.nodeId === userNodeId;
      const isOnPath = pathNodes.some((p) => p.nodeId === node.nodeId);
      const severity = getNodeSeverity(hazards, node.nodeId);

      if (isExit) {
        // Exit: green square
        ctx.fillStyle = '#4CAF50';
        ctx.fillRect(node.x - 15, node.y - 15, 30, 30);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🚪', node.x, node.y);
        // Label
        ctx.fillStyle = '#388E3C';
        ctx.font = 'bold 10px Arial';
        ctx.fillText(node.label || 'Exit', node.x, node.y + 22);
      } else if (isUser) {
        // User: orange circle with icon
        ctx.fillStyle = '#FF9800';
        ctx.beginPath();
        ctx.arc(node.x, node.y, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('👤', node.x, node.y);
      } else if (node.type === 'room' || node.type === 'stairs') {
        // Room/stairs: labeled circle
        const color = severity > 0.3 ? '#ff9800' : node.type === 'stairs' ? '#9C27B0' : '#607D8B';
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(node.x, node.y, 8, 0, Math.PI * 2);
        ctx.fill();
        if (node.label) {
          ctx.fillStyle = '#333';
          ctx.font = '9px Arial';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          ctx.fillText(node.label, node.x, node.y + 12);
        }
      } else {
        // Junction: small dot
        const color = isOnPath ? '#2196F3' : severity > 0 ? '#ff9800' : '#bbb';
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(node.x, node.y, isOnPath ? 5 : 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }, [nodes, edges, hazards, walls, pathNodes, userNodeId, exitNodeIds, width, height]);

  // Redraw whenever props change, with animation for hazards
  useEffect(() => {
    let rafId: number;
    const loop = () => {
      draw();
      rafId = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(rafId);
  }, [draw]);

  const handleClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = width / rect.width;
    const scaleY = height / rect.height;
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;

    // Find nearest node
    let nearest: FloorNode | null = null;
    let nearestDist = Infinity;
    for (const n of nodes) {
      const d = Math.sqrt((n.x - x) ** 2 + (n.y - y) ** 2);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = n;
      }
    }

    if (nearest && nearestDist < 40) {
      onNodeClick?.(nearest.nodeId);
    }
  };

  const handleContextMenu = (event: React.MouseEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = width / rect.width;
    const scaleY = height / rect.height;
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;

    // Find nearest node to add hazard
    let nearest: FloorNode | null = null;
    let nearestDist = Infinity;
    for (const n of nodes) {
      const d = Math.sqrt((n.x - x) ** 2 + (n.y - y) ** 2);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = n;
      }
    }

    if (nearest && nearestDist < 40) {
      onAddHazard?.(nearest.nodeId);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative"
    >
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        className="border-2 border-gray-300 rounded-lg shadow-lg cursor-pointer"
        style={{ maxWidth: '100%', height: 'auto' }}
      />
      <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm px-3 py-2 rounded-lg text-sm shadow-md">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-3 h-3 bg-orange-500 rounded-full" />
          <span>Your Position</span>
        </div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-3 h-3 bg-green-500 rounded-full" />
          <span>Exit</span>
        </div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-3 h-3 bg-blue-500 rounded-full" />
          <span>Safe Path</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-500 rounded-full" />
          <span>Hazard</span>
        </div>
      </div>
      <p className="text-[10px] text-gray-400 mt-1 text-center">
        Click = move · Right-click = add fire
      </p>
    </motion.div>
  );
}
