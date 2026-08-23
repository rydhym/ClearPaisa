"use client";

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import TransactionModal from '@/components/TransactionModal';
import { Search, Plus, Trash2, Edit, Check } from 'lucide-react';

interface Transaction {
  id: string;
  amount: number;
  type: 'DEBIT' | 'CREDIT';
  timestamp: string;
  paymentMode: string;
  referenceNumber?: string;
  description?: string;
  source: string;
  category?: { name: string };
  merchant?: { name: string };
}

export default function Transactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  
  // Search & Filter parameters
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [type, setType] = useState('');
  const [page, setPage] = useState(1);

  // Edit Transaction inline states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCategory, setEditCategory] = useState('');

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const res = await api.get('/transactions', {
        params: {
          search,
          category,
          type,
          page,
          limit: 50
        }
      });
      setTransactions(res.data.transactions);
      setTotal(res.data.total);
    } catch (e) {
      console.error('Failed to load transactions list', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [search, category, type, page]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this transaction record?')) return;
    try {
      await api.delete(`/transactions/${id}`);
      fetchTransactions();
    } catch (e) {
      alert('Failed to delete transaction.');
    }
  };

  const handleUpdateCategory = async (id: string) => {
    try {
      await api.patch(`/transactions/${id}`, {
        categoryName: editCategory
      });
      setEditingId(null);
      fetchTransactions();
    } catch (e) {
      alert('Failed to update category.');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Controls Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Financial Timeline</h2>
          <p className="text-xs text-apple-gray-300 mt-1">Aggregated feeds across Setu, Gmail, PDFs and CSVs</p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="bg-black text-white px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 hover:bg-black/90 active:scale-95 transition-all self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          Add Transaction / Upload Statement
        </button>
      </div>

      {/* Filters Card */}
      <div className="apple-card p-4 grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
        
        {/* Search */}
        <div className="relative col-span-1 md:col-span-2">
          <Search className="w-4 h-4 text-apple-gray-300 absolute left-3 top-3.5" />
          <input
            type="text"
            placeholder="Search by merchant, description, reference ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[#e8e8ed] text-sm focus:outline-none focus:border-black bg-[#f5f5f7]/30"
          />
        </div>

        {/* Category Filter */}
        <div>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-[#e8e8ed] text-sm focus:outline-none focus:border-black bg-[#f5f5f7]/30"
          >
            <option value="">All Categories</option>
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

        {/* Flow Type */}
        <div>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-[#e8e8ed] text-sm focus:outline-none focus:border-black bg-[#f5f5f7]/30"
          >
            <option value="">All Flow Types</option>
            <option value="DEBIT">Debit (Spends)</option>
            <option value="CREDIT">Credit (Income)</option>
          </select>
        </div>
      </div>

      {/* Main Table List */}
      <div className="apple-card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-apple-gray-300 animate-pulse text-sm font-semibold">Updating timeline feed...</div>
        ) : transactions.length === 0 ? (
          <div className="p-12 text-center text-apple-gray-300 text-sm font-medium">No transactions found matching your criteria.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-[#f5f5f7]/50 text-apple-gray-300 text-[10px] uppercase tracking-wider font-extrabold border-b border-[#e8e8ed]">
                  <th className="p-4">Date</th>
                  <th className="p-4">Merchant & Description</th>
                  <th className="p-4">Source</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Method</th>
                  <th className="p-4 text-right">Amount</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e8e8ed]">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-[#f5f5f7]/40 transition-colors">
                    <td className="p-4 whitespace-nowrap text-apple-gray-400 font-medium">
                      {new Date(tx.timestamp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="p-4 max-w-xs">
                      <p className="font-bold truncate text-[#1d1d1f]">{tx.merchant?.name || 'Unknown'}</p>
                      <p className="text-xs text-apple-gray-300 truncate mt-0.5" title={tx.description || tx.referenceNumber}>
                        {tx.description || tx.referenceNumber || 'No description provided'}
                      </p>
                    </td>
                    <td className="p-4">
                      <span className="inline-block px-2.5 py-1 bg-apple-gray-50 border border-apple-gray-100 text-[10px] font-bold rounded-lg uppercase tracking-wider text-apple-gray-300">
                        {tx.source}
                      </span>
                    </td>
                    <td className="p-4">
                      {editingId === tx.id ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={editCategory}
                            onChange={(e) => setEditCategory(e.target.value)}
                            className="px-2 py-1 rounded border text-xs focus:outline-none focus:border-black max-w-[120px]"
                            autoFocus
                          />
                          <button 
                            onClick={() => handleUpdateCategory(tx.id)}
                            className="p-1 hover:bg-emerald-50 rounded text-emerald-600"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-apple-gray-400">
                            {tx.category?.name || 'Others'}
                          </span>
                          <button
                            onClick={() => {
                              setEditingId(tx.id);
                              setEditCategory(tx.category?.name || 'Others');
                            }}
                            className="p-1 opacity-0 group-hover:opacity-100 hover:bg-[#f5f5f7] rounded transition-all text-apple-gray-300"
                          >
                            <Edit className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="p-4 text-apple-gray-400 text-xs font-semibold">{tx.paymentMode}</td>
                    <td className="p-4 text-right">
                      <span className={`font-bold ${tx.type === 'DEBIT' ? 'text-red-500' : 'text-emerald-500'}`}>
                        {tx.type === 'DEBIT' ? '-' : '+'}₹{tx.amount.toFixed(2)}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => handleDelete(tx.id)}
                        className="p-1.5 hover:bg-red-50 hover:text-red-600 rounded-xl text-apple-gray-300 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Transaction Entry Modal popup */}
      {showModal && (
        <TransactionModal
          onClose={() => setShowModal(false)}
          onSuccess={fetchTransactions}
        />
      )}
    </div>
  );
}
