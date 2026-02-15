import { useSocket } from '../../hooks/useSocket';
import { ResponderDashboard } from '../ResponderDashboard';
import { Badge } from '../ui/badge';
import { Card } from '../ui/card';

export function DashboardPage() {
  const { connected, occupants, hazards, buildingArea } = useSocket();

  return (
    <div className="min-h-full bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="p-4 border-b bg-white flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Responder Dashboard</h1>
        <Badge variant={connected ? 'default' : 'secondary'} className={connected ? 'bg-green-600' : ''}>
          {connected ? 'Live' : 'Connecting…'}
        </Badge>
      </div>
      <div className="p-4">
        {!connected && (
          <Card className="p-4 mb-4 bg-amber-50 border-amber-200">
            <p className="text-sm text-amber-800">
              Start the backend server to see live data: <code className="bg-amber-100 px-1 rounded">cd server && npm run dev</code>
            </p>
          </Card>
        )}
        <ResponderDashboard
          users={occupants}
          hazards={hazards}
          buildingArea={buildingArea}
        />
      </div>
    </div>
  );
}
