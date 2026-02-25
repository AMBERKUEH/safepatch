const API_BASE = import.meta.env.VITE_API_URL || 'https://pangtengg-disaster-prediction.hf.space';

export interface DisasterPayload {
  country: string;
  disaster_type: string;
  severity_index: number;
  casualties: number;
  economic_loss_usd: number;
  aid_amount_usd: number;
  response_efficiency_score: number;
  recovery_days: number;
  latitude: number;
  longitude: number;
  month: number;
  year: number;
}

export interface PredictionResult {
  predicted_response_time_hours: number;
  severity_tier: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';
  [key: string]: unknown;
}

export async function predictResponseTime(
  disasterData: DisasterPayload
): Promise<PredictionResult> {
  const response = await fetch(`${API_BASE}/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(disasterData),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return response.json();
}

export async function checkAPIHealth(): Promise<unknown> {
  const response = await fetch(`${API_BASE}/`);
  return response.json();
}

