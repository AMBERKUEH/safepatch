import { useState, useEffect } from 'react';
import { PredictionPanel } from '../PredictionPanel';
import { FirebaseFeed } from '../FirebaseFeed';
import { checkFirebaseStatus } from '../../services/firebase';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

export function DashboardPage() {
  const [firebaseStatus, setFirebaseStatus] = useState<'checking' | 'connected' | 'error'>('checking');

  useEffect(() => {
    checkFirebaseStatus().then(setFirebaseStatus);
  }, []);

  return (
    <div className="min-h-full bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="p-4 border-b bg-white flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">User Dashboard</h1>
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${firebaseStatus === 'connected'
            ? 'bg-green-100 text-green-700'
            : firebaseStatus === 'error'
              ? 'bg-red-100 text-red-700'
              : 'bg-gray-100 text-gray-500'
          }`}>
          {firebaseStatus === 'connected' && <CheckCircle className="w-3.5 h-3.5" />}
          {firebaseStatus === 'error' && <XCircle className="w-3.5 h-3.5" />}
          {firebaseStatus === 'checking' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          Firebase: {firebaseStatus === 'checking' ? 'Checking...' : firebaseStatus === 'connected' ? 'Connected' : 'Error'}
        </div>
      </div>
      <div className="p-4 space-y-4 pb-32">
        <div className="max-w-4xl mx-auto space-y-4">
          <FirebaseFeed />
          <PredictionPanel />
        </div>
      </div>
    </div>
  );
}

