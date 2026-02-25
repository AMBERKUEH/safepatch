import { useState } from 'react';
import { predictResponseTime, type DisasterPayload } from '../services/predictionAPI';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

const COUNTRIES = [
  'Philippines',
  'Indonesia',
  'Japan',
  'India',
  'Bangladesh',
  'Brazil',
  'United States',
  'China',
  'Nigeria',
  'Germany',
] as const;

const DISASTER_TYPES = [
  'Earthquake',
  'Flood',
  'Hurricane',
  'Wildfire',
  'Landslide',
  'Drought',
  'Tornado',
  'Storm Surge',
  'Extreme Heat',
  'Volcanic Eruption',
] as const;

const TIER_COLORS: Record<DisasterPayloadSeverityTier, string> = {
  CRITICAL: '#ef4444',
  HIGH: '#f97316',
  MODERATE: '#eab308',
  LOW: '#22c55e',
};

type DisasterPayloadSeverityTier = 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';

interface PredictionResultView {
  predicted_response_time_hours: number;
  severity_tier: DisasterPayloadSeverityTier;
}

export function PredictionPanel() {
  const [form, setForm] = useState({
    country: 'Philippines',
    disaster_type: 'Earthquake',
    severity_index: '',
    casualties: '',
    economic_loss_usd: '',
    aid_amount_usd: '',
    response_efficiency_score: '',
    recovery_days: '',
    latitude: '',
    longitude: '',
    month: String(new Date().getMonth() + 1),
    year: String(new Date().getFullYear()),
  });

  const [result, setResult] = useState<PredictionResultView | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const payload: DisasterPayload = {
        country: form.country,
        disaster_type: form.disaster_type,
        severity_index: parseFloat(form.severity_index),
        casualties: parseInt(form.casualties, 10),
        economic_loss_usd: parseFloat(form.economic_loss_usd),
        aid_amount_usd: parseFloat(form.aid_amount_usd),
        response_efficiency_score: parseFloat(form.response_efficiency_score),
        recovery_days: parseInt(form.recovery_days, 10),
        latitude: parseFloat(form.latitude),
        longitude: parseFloat(form.longitude),
        month: parseInt(form.month, 10),
        year: parseInt(form.year, 10),
      };

      const data = await predictResponseTime(payload);
      setResult({
        predicted_response_time_hours: data.predicted_response_time_hours as number,
        severity_tier: data.severity_tier as DisasterPayloadSeverityTier,
      });
    } catch (err: any) {
      setError(err?.message ?? 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const tierColor = result ? TIER_COLORS[result.severity_tier] : '#22c55e';

  return (
    <Card className="bg-slate-950/90 border-slate-800 text-slate-50 p-6 space-y-4">
      <div>
        <h3 className="text-base font-semibold flex items-center gap-2">
          <span>🔮 Disaster Response Predictor</span>
        </h3>
        <p className="text-xs text-slate-400 mt-1">
          Fill in disaster details to predict response time for affected users.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Country */}
        <div className="flex flex-col gap-1.5">
          <Label className="text-[11px] font-semibold text-slate-400">Country</Label>
          <Select
            value={form.country}
            onValueChange={(value) => setForm((f) => ({ ...f, country: value }))}
          >
            <SelectTrigger className="h-9 bg-slate-900 border-slate-700 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COUNTRIES.map((c) => (
                <SelectItem key={c} value={c} className="text-xs">
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Disaster Type */}
        <div className="flex flex-col gap-1.5">
          <Label className="text-[11px] font-semibold text-slate-400">Disaster Type</Label>
          <Select
            value={form.disaster_type}
            onValueChange={(value) => setForm((f) => ({ ...f, disaster_type: value }))}
          >
            <SelectTrigger className="h-9 bg-slate-900 border-slate-700 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DISASTER_TYPES.map((d) => (
                <SelectItem key={d} value={d} className="text-xs">
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Severity */}
        <div className="flex flex-col gap-1.5">
          <Label className="text-[11px] font-semibold text-slate-400">
            Severity Index (1–10)
          </Label>
          <Input
            name="severity_index"
            type="number"
            step="0.1"
            min="1"
            max="10"
            placeholder="e.g. 6.5"
            value={form.severity_index}
            onChange={handleChange}
            className="h-9 bg-slate-900 border-slate-700 text-xs"
          />
        </div>

        {/* Casualties */}
        <div className="flex flex-col gap-1.5">
          <Label className="text-[11px] font-semibold text-slate-400">Casualties</Label>
          <Input
            name="casualties"
            type="number"
            placeholder="e.g. 120"
            value={form.casualties}
            onChange={handleChange}
            className="h-9 bg-slate-900 border-slate-700 text-xs"
          />
        </div>

        {/* Economic Loss */}
        <div className="flex flex-col gap-1.5">
          <Label className="text-[11px] font-semibold text-slate-400">
            Economic Loss (USD)
          </Label>
          <Input
            name="economic_loss_usd"
            type="number"
            placeholder="e.g. 5000000"
            value={form.economic_loss_usd}
            onChange={handleChange}
            className="h-9 bg-slate-900 border-slate-700 text-xs"
          />
        </div>

        {/* Aid Amount */}
        <div className="flex flex-col gap-1.5">
          <Label className="text-[11px] font-semibold text-slate-400">Aid Amount (USD)</Label>
          <Input
            name="aid_amount_usd"
            type="number"
            placeholder="e.g. 200000"
            value={form.aid_amount_usd}
            onChange={handleChange}
            className="h-9 bg-slate-900 border-slate-700 text-xs"
          />
        </div>

        {/* Response Efficiency */}
        <div className="flex flex-col gap-1.5">
          <Label className="text-[11px] font-semibold text-slate-400">
            Response Efficiency Score
          </Label>
          <Input
            name="response_efficiency_score"
            type="number"
            step="0.1"
            placeholder="e.g. 85.5"
            value={form.response_efficiency_score}
            onChange={handleChange}
            className="h-9 bg-slate-900 border-slate-700 text-xs"
          />
        </div>

        {/* Recovery Days */}
        <div className="flex flex-col gap-1.5">
          <Label className="text-[11px] font-semibold text-slate-400">Recovery Days</Label>
          <Input
            name="recovery_days"
            type="number"
            placeholder="e.g. 45"
            value={form.recovery_days}
            onChange={handleChange}
            className="h-9 bg-slate-900 border-slate-700 text-xs"
          />
        </div>

        {/* Latitude */}
        <div className="flex flex-col gap-1.5">
          <Label className="text-[11px] font-semibold text-slate-400">Latitude</Label>
          <Input
            name="latitude"
            type="number"
            step="0.001"
            placeholder="e.g. 14.5"
            value={form.latitude}
            onChange={handleChange}
            className="h-9 bg-slate-900 border-slate-700 text-xs"
          />
        </div>

        {/* Longitude */}
        <div className="flex flex-col gap-1.5">
          <Label className="text-[11px] font-semibold text-slate-400">Longitude</Label>
          <Input
            name="longitude"
            type="number"
            step="0.001"
            placeholder="e.g. 121.0"
            value={form.longitude}
            onChange={handleChange}
            className="h-9 bg-slate-900 border-slate-700 text-xs"
          />
        </div>
      </div>

      <Button
        onClick={handleSubmit}
        disabled={loading}
        className="w-full bg-gradient-to-r from-blue-500 to-violet-600 hover:from-blue-600 hover:to-violet-700 text-sm font-semibold"
      >
        {loading ? '⏳ Predicting…' : '⚡ Predict Response Time'}
      </Button>

      {error && (
        <div className="mt-3 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          ❌ Error: {error}
        </div>
      )}

      {result && (
        <div className="mt-4 rounded-md border border-blue-500/40 bg-blue-500/10 px-4 py-3 text-center space-y-2">
          <p className="text-xs text-slate-300">Predicted Response Time</p>
          <p className="text-3xl font-extrabold text-blue-400">
            {result.predicted_response_time_hours.toFixed(1)} hrs
          </p>
          <span
            className="inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold tracking-wide"
            style={{
              backgroundColor: `${tierColor}22`,
              color: tierColor,
              border: `1px solid ${tierColor}`,
            }}
          >
            {result.severity_tier}
          </span>
        </div>
      )}
    </Card>
  );
}

