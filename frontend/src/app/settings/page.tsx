"use client";

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { 
  Building2, 
  Mail, 
  Trash2, 
  Download, 
  ShieldAlert, 
  CheckCircle,
  ExternalLink
} from 'lucide-react';

interface Consent {
  id: string;
  provider: string;
  consentId: string;
  status: string;
  validTo: string;
}

export default function Settings() {
  const logout = useAuthStore(state => state.logout);
  const [consents, setConsents] = useState<Consent[]>([]);
  const [loadingConsents, setLoadingConsents] = useState(true);

  // Bank connect states
  const [selectedBank, setSelectedBank] = useState('HDFC Bank');
  const [connectingBank, setConnectingBank] = useState(false);
  const [pendingConsentId, setPendingConsentId] = useState<string | null>(null);
  const [sandboxRedirectUrl, setSandboxRedirectUrl] = useState<string | null>(null);

  const fetchConsents = async () => {
    try {
      const res = await api.get('/users/consents');
      setConsents(res.data);
    } catch (e) {
      console.error('Failed to load consents', e);
    } finally {
      setLoadingConsents(false);
    }
  };

  useEffect(() => {
    fetchConsents();
  }, []);

  // Setu AA flow: 1. Initiate
  const handleConnectBank = async () => {
    setConnectingBank(true);
    try {
      const res = await api.post('/account-aggregator/initiate', { bankId: selectedBank.toLowerCase().replace(' ', '_') });
      setPendingConsentId(res.data.consentId);
      setSandboxRedirectUrl(res.data.redirectUrl);
    } catch (e) {
      alert('Failed to connect bank.');
    } finally {
      setConnectingBank(false);
    }
  };

  // Setu AA flow: 2. Sandbox Approve Simulation
  const handleApproveSandbox = async () => {
    if (!pendingConsentId) return;
    try {
      // Approve consent
      await api.post('/account-aggregator/sandbox/approve', { consentId: pendingConsentId });
      
      // Pull transactions immediately
      await api.post('/account-aggregator/sync');
      
      setPendingConsentId(null);
      setSandboxRedirectUrl(null);
      fetchConsents();
      alert(`Bank accounts connected successfully! Setu sandbox has seeded mock bank records.`);
    } catch (e) {
      alert('Failed to approve sandbox consent.');
    }
  };

  const handleLinkGmail = async () => {
    try {
      const res = await api.post('/auth/google', {
        email: "sandbox_user@gmail.com",
        name: "Sandbox Gmail",
        token: "mock_gmail_access_token_9988"
      });
      // Sync Gmail right away
      await api.post('/gmail/sync');
      fetchConsents();
      alert('Gmail integration linked in sandbox. Processed and extracted transaction notices!');
    } catch (e) {
      alert('Failed to link Gmail account.');
    }
  };

  const handleRevoke = async (id: string) => {
    try {
      await api.post(`/users/consents/${id}/revoke`);
      fetchConsents();
      alert('Permissions revoked successfully.');
    } catch (e) {
      alert('Failed to revoke access.');
    }
  };

  const handleExportData = async () => {
    try {
      const res = await api.get('/users/export');
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(res.data, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `ClearPaisa_Export_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (e) {
      alert('Failed to export profile.');
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm('WARNING: Deleting your account will permanently wipe all bank accounts, budgets, subscriptions, parsed receipts, and transaction records. This cannot be undone. Proceed?')) return;
    try {
      await api.delete('/users/delete');
      logout();
    } catch (e) {
      alert('Failed to wipe profile.');
    }
  };

  return (
    <div className="space-y-8">
      
      <div>
        <h2 className="text-xl font-bold tracking-tight">Integrations & Settings</h2>
        <p className="text-xs text-apple-gray-300 mt-1">Manage connected banks, credentials, and data exports</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Connection Setup panel */}
        <div className="space-y-6">
          
          {/* Account Aggregator Setu card */}
          <div className="apple-card p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-black" />
              <h3 className="text-base font-bold tracking-tight">Setu Account Aggregator</h3>
            </div>
            <p className="text-xs text-apple-gray-300">Link your savings accounts secure and consent-based via Setu sandbox.</p>
            
            {pendingConsentId ? (
              /* Sandbox Simulator Display */
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-3">
                <p className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4" />
                  Setu Sandbox consent approval needed
                </p>
                <p className="text-[11px] text-amber-700">
                  Consent ID: <code className="font-mono bg-amber-100 px-1 py-0.5 rounded">{pendingConsentId}</code>
                </p>
                <div className="flex gap-2">
                  <button 
                    onClick={handleApproveSandbox}
                    className="bg-amber-600 text-white text-xs px-3 py-2 rounded-xl font-semibold hover:bg-amber-700 active:scale-95 transition-all"
                  >
                    Simulate Sandbox Approval
                  </button>
                  {sandboxRedirectUrl && (
                    <a 
                      href={sandboxRedirectUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="border border-amber-300 text-amber-700 text-xs px-3 py-2 rounded-xl font-semibold flex items-center gap-1 hover:bg-amber-100 transition-all"
                    >
                      View Redirect url
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <select
                  value={selectedBank}
                  onChange={(e) => setSelectedBank(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-[#e8e8ed] text-xs font-medium focus:outline-none focus:border-black bg-[#f5f5f7]/50"
                >
                  <option value="HDFC Bank">HDFC Bank</option>
                  <option value="ICICI Bank">ICICI Bank</option>
                  <option value="SBI Bank">State Bank of India</option>
                  <option value="Axis Bank">Axis Bank</option>
                </select>
                <button
                  onClick={handleConnectBank}
                  disabled={connectingBank}
                  className="bg-black text-white text-xs px-4 py-2 rounded-xl font-semibold hover:bg-black/90 active:scale-95 transition-all disabled:opacity-50"
                >
                  {connectingBank ? 'Connecting...' : 'Connect Bank via Setu'}
                </button>
              </div>
            )}
          </div>

          {/* Gmail Link Card */}
          <div className="apple-card p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-black" />
              <h3 className="text-base font-bold tracking-tight">Gmail Transaction Sync</h3>
            </div>
            <p className="text-xs text-apple-gray-300">Integrate Gmail to automatically scrape UPI notices and bill receipts.</p>
            <button
              onClick={handleLinkGmail}
              className="bg-black text-white text-xs px-4 py-2.5 rounded-xl font-semibold hover:bg-black/90 active:scale-95 transition-all self-start"
            >
              Link Gmail Account (Google OAuth)
            </button>
          </div>
        </div>

        {/* Consents list, Export, & Delete Panel */}
        <div className="space-y-6">
          
          {/* Active consents tracker */}
          <div className="apple-card p-6">
            <h3 className="text-base font-bold tracking-tight mb-4">Linked Permissions & Consents</h3>
            {loadingConsents ? (
              <p className="text-xs text-apple-gray-300 animate-pulse">Loading permissions...</p>
            ) : consents.length === 0 ? (
              <p className="text-xs text-apple-gray-300 py-4 text-center">No linked permissions registered.</p>
            ) : (
              <div className="space-y-4 max-h-56 overflow-y-auto divide-y divide-[#e8e8ed]">
                {consents.map((c) => (
                  <div key={c.id} className="pt-3 flex justify-between items-center text-xs">
                    <div>
                      <p className="font-bold text-[#1d1d1f]">{c.provider} Consent</p>
                      <p className="text-[10px] text-apple-gray-300 mt-1">ID: {c.consentId}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-0.5 rounded font-bold text-[9px] ${
                        c.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'
                      }`}>
                        {c.status}
                      </span>
                      {c.status === 'ACTIVE' && (
                        <button
                          onClick={() => handleRevoke(c.id)}
                          className="text-red-500 hover:underline font-semibold"
                        >
                          Revoke
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Security details, Export & Wipe Account */}
          <div className="apple-card p-6 space-y-6 border border-red-100 bg-red-50/5">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-red-600" />
              <h3 className="text-base font-bold tracking-tight text-red-950">Security & Data Controls</h3>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleExportData}
                className="flex-1 border border-[#e8e8ed] hover:bg-[#f5f5f7] py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all"
              >
                <Download className="w-4 h-4 text-apple-gray-300" />
                Export Profile JSON
              </button>
              <button
                onClick={handleDeleteAccount}
                className="flex-1 bg-red-600 text-white hover:bg-red-700 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <Trash2 className="w-4 h-4" />
                Wipe Account
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
