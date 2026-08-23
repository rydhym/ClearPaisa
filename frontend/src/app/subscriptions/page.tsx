"use client";

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Calendar, Trash2, Plus, Sparkles } from 'lucide-react';

interface Subscription {
  id: string;
  name: string;
  amount: number;
  billingCycle: string;
  nextBillingDate: string;
  status: string;
}

export default function Subscriptions() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);

  // New Subscription Form State
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [cycle, setCycle] = useState('MONTHLY');
  const [nextDate, setNextDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [saving, setSaving] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [error, setError] = useState('');

  const fetchSubscriptions = async () => {
    try {
      const res = await api.get('/subscriptions');
      setSubscriptions(res.data);
    } catch (e) {
      console.error('Failed to load subscriptions', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const handleCreateSub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !amount) return;
    setSaving(true);
    setError('');

    try {
      await api.post('/subscriptions', {
        name,
        amount: parseFloat(amount),
        billingCycle: cycle,
        nextBillingDate: nextDate
      });
      setName('');
      setAmount('');
      fetchSubscriptions();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save subscription');
    } finally {
      setSaving(false);
    }
  };

  const handleRunDetection = async () => {
    setDetecting(true);
    try {
      await api.post('/subscriptions/detect');
      fetchSubscriptions();
      alert('Subscription sweep complete! Scanned transactions history for duplicates and recurring debit patterns.');
    } catch (e) {
      console.error(e);
      alert('Auto-detection sweep failed.');
    } finally {
      setDetecting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to stop tracking this subscription?')) return;
    try {
      await api.delete(`/subscriptions/${id}`);
      fetchSubscriptions();
    } catch (e) {
      alert('Failed to remove subscription.');
    }
  };

  return (
    <div className="space-y-8">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Recurring Bills & Subscriptions</h2>
          <p className="text-xs text-apple-gray-300 mt-1">Monitor Netflix, utilities, and automatic billing schedules</p>
        </div>

        <button
          onClick={handleRunDetection}
          disabled={detecting}
          className="bg-black text-white px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 hover:bg-black/90 active:scale-95 transition-all disabled:opacity-50 self-start md:self-auto"
        >
          <Sparkles className="w-4 h-4 text-emerald-400" />
          {detecting ? 'Scanning timeline...' : 'AI Auto-Detect Subscriptions'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Setup form */}
        <div className="apple-card p-6 h-fit space-y-6">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-black" />
            <h3 className="text-base font-bold tracking-tight">Add Subscription</h3>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-xs p-3 rounded-xl font-semibold">
              {error}
            </div>
          )}

          <form onSubmit={handleCreateSub} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-apple-gray-300 mb-1.5">Subscription Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Spotify, Electricity Bill"
                className="w-full px-4 py-2.5 rounded-xl border border-[#e8e8ed] text-sm focus:outline-none focus:border-black bg-[#f5f5f7]/50"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-apple-gray-300 mb-1.5">Billing Amount (₹)</label>
              <input
                type="number"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="199.00"
                className="w-full px-4 py-2.5 rounded-xl border border-[#e8e8ed] text-sm focus:outline-none focus:border-black bg-[#f5f5f7]/50"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-apple-gray-300 mb-1.5">Billing Cycle</label>
                <select
                  value={cycle}
                  onChange={(e) => setCycle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#e8e8ed] text-sm focus:outline-none focus:border-black bg-[#f5f5f7]/50"
                >
                  <option value="MONTHLY">Monthly</option>
                  <option value="YEARLY">Yearly</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-apple-gray-300 mb-1.5">Next Renewal</label>
                <input
                  type="date"
                  required
                  value={nextDate}
                  onChange={(e) => setNextDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#e8e8ed] text-sm focus:outline-none focus:border-black bg-[#f5f5f7]/50"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-black text-white py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 hover:bg-black/90 active:scale-95 transition-all disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              {saving ? 'Creating...' : 'Track Subscription'}
            </button>
          </form>
        </div>

        {/* List tracker */}
        <div className="lg:col-span-2 apple-card p-6">
          <h3 className="text-base font-bold tracking-tight mb-6">Subscriptions list</h3>
          
          {loading ? (
            <div className="text-center py-6 text-apple-gray-300 text-sm animate-pulse">Running checks...</div>
          ) : subscriptions.length === 0 ? (
            <div className="text-center py-6 text-apple-gray-300 text-sm font-medium">No recurring subscription alerts active.</div>
          ) : (
            <div className="divide-y divide-[#e8e8ed]">
              {subscriptions.map((sub) => (
                <div key={sub.id} className="py-4 flex justify-between items-center text-sm">
                  <div>
                    <h4 className="font-bold text-[#1d1d1f]">{sub.name}</h4>
                    <p className="text-xs text-apple-gray-300 mt-1">
                      Billing: **{sub.billingCycle}** • Next renewal: {new Date(sub.nextBillingDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-bold">₹{sub.amount.toFixed(2)}</span>
                    <button
                      onClick={() => handleDelete(sub.id)}
                      className="p-1.5 hover:bg-red-50 hover:text-red-600 rounded-xl text-apple-gray-300 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
