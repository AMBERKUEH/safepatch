import { useEffect, useRef } from 'react';
import { Point, Obstacle } from '../utils/pathfinding';
import { motion } from 'motion/react';

interface FloorPlanProps {
  userPosition: Point;
  exitPosition: Point;
  path: Point[];
  obstacles: Obstacle[];
  onUserMove?: (position: Point) => void;
  width?: number;
  height?: number;
}

export function FloorPlan({
  userPosition,
  exitPosition,
  path,
  obstacles,
  onUserMove,
  width = 600,
  height = 400,
}: FloorPlanProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(0, 0, width, height);

    // Draw grid
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 20) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 20) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Draw obstacles
    obstacles.forEach((obstacle) => {
      switch (obstacle.type) {
        case 'wall':
          ctx.fillStyle = '#9e9e9e';
          break;
        case 'fire':
          ctx.fillStyle = '#ff5722';
          break;
        case 'smoke':
          ctx.fillStyle = '#757575';
          break;
        case 'blocked':
          ctx.fillStyle = '#f44336';
          break;
      }
      ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);

      // Add danger icon for hazards
      if (obstacle.type === 'fire' || obstacle.type === 'smoke') {
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(
          obstacle.type === 'fire' ? '🔥' : '💨',
          obstacle.x + obstacle.width / 2,
          obstacle.y + obstacle.height / 2
        );
      }
    });

    // Draw path
    if (path.length > 1) {
      ctx.strokeStyle = '#2196F3';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      // Dashed line for path
      ctx.setLineDash([10, 5]);
      ctx.beginPath();
      ctx.moveTo(path[0].x, path[0].y);
      for (let i = 1; i < path.length; i++) {
        ctx.lineTo(path[i].x, path[i].y);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw direction arrows
      for (let i = 0; i < path.length - 1; i++) {
        const start = path[i];
        const end = path[i + 1];
        const angle = Math.atan2(end.y - start.y, end.x - start.x);
        
        const midX = (start.x + end.x) / 2;
        const midY = (start.y + end.y) / 2;

        ctx.save();
        ctx.translate(midX, midY);
        ctx.rotate(angle);
        
        // Arrow head
        ctx.fillStyle = '#2196F3';
        ctx.beginPath();
        ctx.moveTo(8, 0);
        ctx.lineTo(-4, -6);
        ctx.lineTo(-4, 6);
        ctx.closePath();
        ctx.fill();
        
        ctx.restore();
      }
    }

    // Draw exit
    ctx.fillStyle = '#4CAF50';
    ctx.fillRect(exitPosition.x - 15, exitPosition.y - 15, 30, 30);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🚪', exitPosition.x, exitPosition.y);

    // Draw user position
    ctx.fillStyle = '#FF9800';
    ctx.beginPath();
    ctx.arc(userPosition.x, userPosition.y, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.stroke();
    
    // User icon
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('👤', userPosition.x, userPosition.y);
  }, [userPosition, exitPosition, path, obstacles, width, height]);

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onUserMove) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    onUserMove({ x, y });
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
        onClick={handleCanvasClick}
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
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-500 rounded-full" />
          <span>Safe Path</span>
        </div>
      </div>
    </motion.div>
  );
}
