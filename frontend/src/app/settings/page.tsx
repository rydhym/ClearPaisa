"use client";

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { 
  Building2, 
  Mail, 
  Trash2, 
  Download, 
  ShieldAlert
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
  const [mobileNumber, setMobileNumber] = useState('');
  const [connectingBank, setConnectingBank] = useState(false);
  const [refreshingConsentId, setRefreshingConsentId] = useState<string | null>(null);
  const [setuError, setSetuError] = useState('');

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
    const normalizedMobile = mobileNumber.replace(/\D/g, '').slice(-10);
    if (!/^\d{10}$/.test(normalizedMobile)) {
      setSetuError('Enter a valid 10-digit Indian mobile number.');
      return;
    }
    setSetuError('');
    setConnectingBank(true);
    try {
      const res = await api.post('/account-aggregator/initiate', { mobileNumber: normalizedMobile });
      const redirectUrl = new URL(res.data.redirectUrl);
      if (redirectUrl.protocol !== 'https:') {
        throw new Error('Setu did not return a secure consent URL.');
      }
      window.location.assign(redirectUrl.toString());
    } catch (e: any) {
      setSetuError(e.response?.data?.error || e.message || 'Failed to create Setu consent.');
      setConnectingBank(false);
    }
  };

  // Refresh Setu after returning from its hosted consent screens, then fetch FI data.
  const handleRefreshConsent = async (consentId: string) => {
    setRefreshingConsentId(consentId);
    setSetuError('');
    try {
      const res = await api.post(`/account-aggregator/consents/${consentId}/status`);
      await fetchConsents();
      if (res.data.status === 'ACTIVE') {
        await api.post('/account-aggregator/sync');
        alert('Setu test account connected and financial data synced.');
      } else {
        setSetuError(`Setu consent is still ${res.data.status}. Complete the consent screens, then check again.`);
      }
    } catch (e: any) {
      setSetuError(e.response?.data?.error || 'Failed to refresh Setu consent.');
    } finally {
      setRefreshingConsentId(null);
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
            <p className="text-xs text-apple-gray-300">Open Setu's real sandbox screens to link a mock Setu FIP bank account. Setu FIP-2 uses test OTP <strong>123456</strong>.</p>
            {setuError && <p className="text-xs text-red-600 bg-red-50 p-3 rounded-xl">{setuError}</p>}
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="tel"
                  inputMode="numeric"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  placeholder="10-digit test mobile number"
                  maxLength={10}
                  className="flex-1 px-3 py-2 rounded-xl border border-[#e8e8ed] text-xs font-medium focus:outline-none focus:border-black bg-[#f5f5f7]/50"
                />
                <button
                  onClick={handleConnectBank}
                  disabled={connectingBank}
                  className="bg-black text-white text-xs px-4 py-2 rounded-xl font-semibold hover:bg-black/90 active:scale-95 transition-all disabled:opacity-50"
                >
                  {connectingBank ? 'Opening Setu...' : 'Open Setu Sandbox'}
                </button>
              </div>
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
                      {c.provider === 'SETU' && c.status === 'PENDING' && (
                        <button
                          onClick={() => handleRefreshConsent(c.consentId)}
                          disabled={refreshingConsentId === c.consentId}
                          className="text-amber-700 hover:underline font-semibold disabled:opacity-50"
                        >
                          {refreshingConsentId === c.consentId ? 'Checking…' : 'Check status & sync'}
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
