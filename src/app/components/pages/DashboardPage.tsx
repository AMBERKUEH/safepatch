import { PredictionPanel } from '../PredictionPanel';

export function DashboardPage() {
  return (
    <div className="min-h-full bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="p-4 border-b bg-white flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">User Dashboard</h1>
      </div>
      <div className="p-4 space-y-4 pb-24">
        <div className="max-w-4xl mx-auto">
          <PredictionPanel />
        </div>
      </div>
    </div>
  );
}
