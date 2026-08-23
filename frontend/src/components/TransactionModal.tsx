import { useState } from 'react';
import { X, Upload, Plus } from 'lucide-react';
import api from '@/lib/api';

interface TransactionModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function TransactionModal({ onClose, onSuccess }: TransactionModalProps) {
  const [activeTab, setActiveTab] = useState<'manual' | 'file'>('manual');
  
  // Manual Form States
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'DEBIT' | 'CREDIT'>('DEBIT');
  const [merchantName, setMerchantName] = useState('');
  const [category, setCategory] = useState('');
  const [timestamp, setTimestamp] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMode, setPaymentMode] = useState('UPI');
  const [description, setDescription] = useState('');
  
  // File upload States
  const [file, setFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<'csv' | 'pdf'>('csv');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.post('/transactions/manual', {
        amount,
        type,
        merchantName,
        category,
        timestamp,
        paymentMode,
        description
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to record transaction');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a file to upload');
      return;
    }
    setError('');
    setLoading(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const endpoint = fileType === 'csv' ? '/transactions/upload-csv' : '/transactions/upload-pdf';
      await api.post(endpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to parse and upload bank statement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-[#e8e8ed] rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl relative">
        {/* Header */}
        <div className="p-6 border-b border-[#e8e8ed] flex items-center justify-between">
          <h3 className="text-lg font-bold tracking-tight">Record Transaction</h3>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-[#f5f5f7] rounded-full transition-all"
          >
            <X className="w-5 h-5 text-apple-gray-300" />
          </button>
        </div>

        {/* Tab switchers */}
        <div className="flex border-b border-[#e8e8ed] bg-[#f5f5f7]/50">
          <button
            onClick={() => setActiveTab('manual')}
            className={`flex-1 py-3 text-center text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'manual' ? 'border-black text-black' : 'border-transparent text-apple-gray-300'
            }`}
          >
            Manual Entry
          </button>
          <button
            onClick={() => setActiveTab('file')}
            className={`flex-1 py-3 text-center text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'file' ? 'border-black text-black' : 'border-transparent text-apple-gray-300'
            }`}
          >
            Upload Statement (CSV/PDF)
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="bg-red-50 text-red-600 text-xs p-4 rounded-xl mb-4 font-semibold">
              {error}
            </div>
          )}

          {activeTab === 'manual' ? (
            /* Manual Form */
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-apple-gray-300 mb-1.5">Amount (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="250.00"
                    className="w-full px-4 py-2.5 rounded-xl border border-[#e8e8ed] text-sm focus:outline-none focus:border-black bg-[#f5f5f7]/50"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-apple-gray-300 mb-1.5">Flow Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as 'DEBIT' | 'CREDIT')}
                    className="w-full px-4 py-2.5 rounded-xl border border-[#e8e8ed] text-sm focus:outline-none focus:border-black bg-[#f5f5f7]/50"
                  >
                    <option value="DEBIT">Debit (Spend)</option>
                    <option value="CREDIT">Credit (Income)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-apple-gray-300 mb-1.5">Merchant Name</label>
                <input
                  type="text"
                  required
                  value={merchantName}
                  onChange={(e) => setMerchantName(e.target.value)}
                  placeholder="Swiggy, Amazon, Uber, etc."
                  className="w-full px-4 py-2.5 rounded-xl border border-[#e8e8ed] text-sm focus:outline-none focus:border-black bg-[#f5f5f7]/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-apple-gray-300 mb-1.5">Category</label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="Food, Shopping, Bills, etc."
                    className="w-full px-4 py-2.5 rounded-xl border border-[#e8e8ed] text-sm focus:outline-none focus:border-black bg-[#f5f5f7]/50"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-apple-gray-300 mb-1.5">Date</label>
                  <input
                    type="date"
                    required
                    value={timestamp}
                    onChange={(e) => setTimestamp(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-[#e8e8ed] text-sm focus:outline-none focus:border-black bg-[#f5f5f7]/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-apple-gray-300 mb-1.5">Payment Mode</label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-[#e8e8ed] text-sm focus:outline-none focus:border-black bg-[#f5f5f7]/50"
                  >
                    <option value="UPI">UPI</option>
                    <option value="CARD">Credit/Debit Card</option>
                    <option value="NET_BANKING">Net Banking</option>
                    <option value="CASH">Cash</option>
                    <option value="WALLET">Wallet</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-apple-gray-300 mb-1.5">Description</label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Optional memo note"
                    className="w-full px-4 py-2.5 rounded-xl border border-[#e8e8ed] text-sm focus:outline-none focus:border-black bg-[#f5f5f7]/50"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-black text-white py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 hover:bg-black/95 transition-all disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                {loading ? 'Creating...' : 'Add Transaction'}
              </button>
            </form>
          ) : (
            /* File Upload Form */
            <form onSubmit={handleFileUpload} className="space-y-6">
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="fileType"
                    checked={fileType === 'csv'}
                    onChange={() => setFileType('csv')}
                    className="accent-black"
                  />
                  <span className="text-sm font-medium">Bank CSV Statement</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="fileType"
                    checked={fileType === 'pdf'}
                    onChange={() => setFileType('pdf')}
                    className="accent-black"
                  />
                  <span className="text-sm font-medium">Bank PDF Statement</span>
                </label>
              </div>

              <div className="border-2 border-dashed border-[#e8e8ed] hover:border-black rounded-2xl p-8 flex flex-col items-center justify-center gap-3 bg-[#f5f5f7]/30 transition-all cursor-pointer relative">
                <input
                  type="file"
                  accept={fileType === 'csv' ? '.csv' : '.pdf'}
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <Upload className="w-8 h-8 text-apple-gray-300" />
                {file ? (
                  <div className="text-center">
                    <p className="text-sm font-semibold truncate max-w-xs">{file.name}</p>
                    <p className="text-xs text-apple-gray-300 mt-1">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="text-sm font-medium">Click or drag your bank statement here</p>
                    <p className="text-xs text-apple-gray-300 mt-1">Supported formats: .{fileType}</p>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || !file}
                className="w-full bg-black text-white py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 hover:bg-black/95 transition-all disabled:opacity-50"
              >
                <Upload className="w-4 h-4" />
                {loading ? 'Processing Statement...' : `Upload and Parse ${fileType.toUpperCase()}`}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
