"use client";

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Target, Sparkles, Plus } from 'lucide-react';

interface Budget {
  id: string;
  amount: number;
  spent: number;
  progress: number;
  category: { name: string };
}

export default function Budgets() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);

  // New Budget Form State
  const [category, setCategory] = useState('Food');
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchBudgets = async () => {
    try {
      const res = await api.get('/budgets');
      setBudgets(res.data);
    } catch (e) {
      console.error('Failed to fetch budgets list', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBudgets();
  }, []);

  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) return;
    setSaving(true);
    setError('');

    try {
      await api.post('/budgets', { category, amount: parseFloat(amount) });
      setAmount('');
      fetchBudgets();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save budget limit');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      
      <div>
        <h2 className="text-xl font-bold tracking-tight">Category Budgets</h2>
        <p className="text-xs text-apple-gray-300 mt-1">Keep track of your monthly spending ceilings</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Setup Budget Form */}
        <div className="apple-card p-6 h-fit space-y-6">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-black" />
            <h3 className="text-base font-bold tracking-tight">Configure Limit</h3>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-xs p-3 rounded-xl font-semibold">
              {error}
            </div>
          )}

          <form onSubmit={handleSaveBudget} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-apple-gray-300 mb-1.5">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-[#e8e8ed] text-sm focus:outline-none focus:border-black bg-[#f5f5f7]/50"
              >
                <option value="Food">Food</option>
                <option value="Shopping">Shopping</option>
                <option value="Bills">Bills</option>
                <option value="Travel">Travel</option>
                <option value="Fuel">Fuel</option>
                <option value="Medicine">Medicine</option>
                <option value="Entertainment">Entertainment</option>
                <option value="Salary">Salary</option>
                <option value="Investments">Investments</option>
                <option value="Insurance">Insurance</option>
                <option value="Rent">Rent</option>
                <option value="Education">Education</option>
                <option value="Taxes">Taxes</option>
                <option value="EMIs">EMIs</option>
                <option value="Recharge">Recharge</option>
                <option value="Transfer">Transfer</option>
                <option value="ATM">ATM</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-apple-gray-300 mb-1.5">Monthly Limit (₹)</label>
              <input
                type="number"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 5000"
                className="w-full px-4 py-2.5 rounded-xl border border-[#e8e8ed] text-sm focus:outline-none focus:border-black bg-[#f5f5f7]/50"
              />
            </div>

            <button
              type="submit"
              disabled={saving || !amount}
              className="w-full bg-black text-white py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 hover:bg-black/90 active:scale-95 transition-all disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              {saving ? 'Saving...' : 'Set Budget Limit'}
            </button>
          </form>
        </div>

        {/* Budgets Tracker List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="apple-card p-6">
            <h3 className="text-base font-bold tracking-tight mb-6">Active Trackers</h3>
            
            {loading ? (
              <div className="text-center py-6 text-apple-gray-300 text-sm animate-pulse">Recalculating limits...</div>
            ) : budgets.length === 0 ? (
              <div className="text-center py-6 text-apple-gray-300 text-sm font-medium">No budgets active. Setup a category ceiling.</div>
            ) : (
              <div className="space-y-6">
                {budgets.map((b) => {
                  const isOver = b.spent > b.amount;
                  return (
                    <div key={b.id} className="space-y-2">
                      <div className="flex justify-between items-end text-sm">
                        <div>
                          <span className="font-bold text-base">{b.category.name}</span>
                          <span className="text-xs text-apple-gray-300 ml-2">
                            ₹{b.spent.toFixed(2)} spent of ₹{b.amount.toFixed(2)}
                          </span>
                        </div>
                        <span className={`text-xs font-bold ${isOver ? 'text-red-500' : 'text-apple-gray-400'}`}>
                          {b.progress.toFixed(0)}% Used
                        </span>
                      </div>
                      
                      <div className="w-full h-3 bg-[#f5f5f7] rounded-full overflow-hidden border border-[#e8e8ed]">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${
                            isOver ? 'bg-red-500' : b.progress > 80 ? 'bg-amber-400' : 'bg-emerald-400'
                          }`}
                          style={{ width: `${Math.min(100, b.progress)}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* AI recommendations panel */}
          <div className="apple-card p-6 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/10">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-emerald-600" />
              <h3 className="text-sm font-bold tracking-tight text-emerald-800">Budget Recommendations</h3>
            </div>
            <p className="text-xs text-emerald-900 leading-relaxed">
              Our AI analysis suggests capping **Food** spend at ₹6,000 and **Shopping** at ₹4,000 based on your last month timelines. 
              This could save you roughly **₹3,200** which can be redirected to your mutual fund investments!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
