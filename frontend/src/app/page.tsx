"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import NLPQueryBox from "@/components/NLPQueryBox";
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  ShieldCheck, 
  Sparkles, 
  ArrowRightLeft 
} from "lucide-react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer 
} from "recharts";

interface DashboardData {
  kpis: {
    currentBalance: number;
    monthlySpending: number;
    monthlyIncome: number;
    savings: number;
    netCashflow: number;
    healthScore: number;
  };
  topCategories: { name: string; value: number }[];
  recentTransactions: any[];
  subscriptions: any[];
  chartData: any[];
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = async () => {
    try {
      const res = await api.get("/dashboard");
      setData(res.data);
    } catch (e) {
      console.error("Failed to load dashboard statistics", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm text-apple-gray-300 font-medium">Assembling your financial stats...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12 apple-card p-8">
        <p className="text-apple-gray-300 font-medium">Could not fetch dashboard metrics. Please start the backend service.</p>
      </div>
    );
  }

  const { kpis, topCategories, recentTransactions, subscriptions, chartData } = data;

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Net Cashflow Card */}
        <div className="apple-card p-6 flex flex-col justify-between min-h-[140px]">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold uppercase tracking-wider text-apple-gray-300">Net Cashflow</span>
            <Wallet className="w-4 h-4 text-apple-gray-300" />
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold tracking-tight">₹{kpis.netCashflow.toLocaleString('en-IN')}</h3>
            <p className="text-xs text-apple-gray-300 mt-1 flex items-center gap-1">
              {kpis.netCashflow >= 0 ? (
                <>
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-emerald-500 font-medium">Positive cashflow</span> this month
                </>
              ) : (
                <>
                  <TrendingDown className="w-3.5 h-3.5 text-red-500" />
                  <span className="text-red-500 font-medium">Negative cashflow</span> this month
                </>
              )}
            </p>
          </div>
        </div>

        {/* Monthly Spending Card */}
        <div className="apple-card p-6 flex flex-col justify-between min-h-[140px]">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold uppercase tracking-wider text-apple-gray-300">Monthly Spending</span>
            <TrendingDown className="w-4 h-4 text-red-400" />
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold tracking-tight">₹{kpis.monthlySpending.toLocaleString('en-IN')}</h3>
            <p className="text-xs text-apple-gray-300 mt-1">Total debits in current month</p>
          </div>
        </div>

        {/* Monthly Income Card */}
        <div className="apple-card p-6 flex flex-col justify-between min-h-[140px]">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold uppercase tracking-wider text-apple-gray-300">Monthly Income</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold tracking-tight">₹{kpis.monthlyIncome.toLocaleString('en-IN')}</h3>
            <p className="text-xs text-apple-gray-300 mt-1">Total credits in current month</p>
          </div>
        </div>

        {/* Health Score Card */}
        <div className="apple-card p-6 flex flex-col justify-between min-h-[140px]">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold uppercase tracking-wider text-apple-gray-300">Health Score</span>
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-4">
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-extrabold tracking-tight text-emerald-600">{kpis.healthScore}</h3>
              <span className="text-xs font-medium text-apple-gray-300">/ 100</span>
            </div>
            <p className="text-xs text-apple-gray-300 mt-1">AI Financial Health Index</p>
          </div>
        </div>
      </div>

      {/* Main Charts & Side Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Cashflow timeline plot */}
        <div className="lg:col-span-2 apple-card p-6 flex flex-col">
          <div className="mb-4">
            <h3 className="text-base font-bold tracking-tight">Spending Trend</h3>
            <p className="text-xs text-apple-gray-300 mt-0.5">Daily cash outflow tracking</p>
          </div>
          <div className="h-64 mt-4 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" stroke="#86868b" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#86868b" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e8e8ed', fontSize: '12px' }}
                  labelStyle={{ fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="spending" name="Spending (₹)" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorSpend)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Spending Categories */}
        <div className="apple-card p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold tracking-tight font-sans">Top Spending Categories</h3>
            <p className="text-xs text-apple-gray-300 mt-0.5">Categorized debit ratios</p>
          </div>
          <div className="space-y-4 mt-6">
            {topCategories.length === 0 ? (
              <p className="text-xs text-apple-gray-300 py-6 text-center">No categorized expenses logged yet.</p>
            ) : (
              topCategories.map((cat, index) => (
                <div key={cat.name} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span>{cat.name}</span>
                    <span className="font-semibold">₹{cat.value.toFixed(2)}</span>
                  </div>
                  <div className="w-full h-2 bg-[#f5f5f7] rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${
                        index === 0 ? 'bg-black' : index === 1 ? 'bg-apple-gray-300' : 'bg-apple-gray-200'
                      }`}
                      style={{ width: `${Math.min(100, (cat.value / Math.max(1, kpis.monthlySpending)) * 100)}%` }}
                    ></div>
                  </div>
                </div>
              ))
            )}
          </div>
          <div></div>
        </div>
      </div>

      {/* NLP Assistant Component */}
      <NLPQueryBox />

      {/* Transactions & Subscriptions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Recent Transactions list */}
        <div className="lg:col-span-2 apple-card p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-base font-bold tracking-tight">Recent Transactions</h3>
              <p className="text-xs text-apple-gray-300 mt-0.5">Your latest financial activity logs</p>
            </div>
            <a href="/transactions" className="text-xs font-semibold text-black hover:underline flex items-center gap-1">
              View all
              <ArrowRightLeft className="w-3.5 h-3.5" />
            </a>
          </div>

          <div className="divide-y divide-[#e8e8ed]">
            {recentTransactions.length === 0 ? (
              <p className="text-xs text-apple-gray-300 py-12 text-center">No transactions registered yet.</p>
            ) : (
              recentTransactions.map((tx) => (
                <div key={tx.id} className="py-3 flex justify-between items-center text-sm">
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{tx.merchant?.name || 'Unknown Merchant'}</p>
                    <p className="text-xs text-apple-gray-300 mt-0.5">
                      {new Date(tx.timestamp).toLocaleDateString()} • {tx.paymentMode} • {tx.source}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`font-bold ${tx.type === 'DEBIT' ? 'text-red-500' : 'text-emerald-500'}`}>
                      {tx.type === 'DEBIT' ? '-' : '+'}₹{tx.amount.toFixed(2)}
                    </p>
                    <span className="inline-block px-2 py-0.5 bg-[#f5f5f7] text-[10px] font-semibold text-apple-gray-300 rounded-full mt-1">
                      {tx.category?.name || 'Others'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Subscriptions sidebar Panel */}
        <div className="apple-card p-6 flex flex-col">
          <div className="mb-6">
            <h3 className="text-base font-bold tracking-tight">Bills & Subscriptions</h3>
            <p className="text-xs text-apple-gray-300 mt-0.5">Upcoming recurring outlays</p>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto">
            {subscriptions.length === 0 ? (
              <p className="text-xs text-apple-gray-300 py-8 text-center">No subscriptions detected yet.</p>
            ) : (
              subscriptions.map((sub) => (
                <div key={sub.id} className="p-3 bg-[#f5f5f7]/50 border border-[#e8e8ed] rounded-xl flex justify-between items-center">
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate">{sub.name}</p>
                    <p className="text-[10px] text-apple-gray-300 mt-1">
                      Due: {new Date(sub.nextBillingDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right font-bold text-xs shrink-0 text-apple-gray-400">
                    ₹{sub.amount.toFixed(2)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
