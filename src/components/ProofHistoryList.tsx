import React, { useState } from 'react';
import { Share2 } from 'lucide-react';
import { ProofHistoryItem } from '../types';
import { Toast } from './Toast';

interface Props {
  proofs: ProofHistoryItem[];
}

export const ProofHistoryList: React.FC<Props> = ({ proofs }) => {
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  if (proofs.length === 0) {
    return null;
  }

  const shareProof = async (reference: string) => {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('proof', reference);
      await navigator.clipboard.writeText(url.toString());
      setToast({ message: 'Proof link copied to clipboard!', type: 'success' });
    } catch (e) {
      console.error('Failed to copy link:', e);
      setToast({ message: 'Failed to copy link', type: 'error' });
    }
  };

  return (
    <>
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4">Proof History</h2>
        <div className="space-y-2">
          {proofs.map((item) => (
            <div
              key={item.reference}
              className="flex justify-between items-center p-3 bg-gray-700 rounded-lg"
            >
              <div className="flex items-center space-x-3">
                <span>{item.token}</span>
                <span
                  className={`px-2 py-1 text-xs rounded ${
                    item.status === 'verified'
                      ? 'bg-green-900/50 text-green-300'
                      : item.status === 'failed'
                      ? 'bg-red-900/50 text-red-300'
                      : 'bg-yellow-900/50 text-yellow-300'
                  }`}
                >
                  {item.status}
                </span>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-gray-400 text-sm">
                  {new Date(item.timestamp).toLocaleString()}
                </span>
                {item.status === 'verified' && (
                  <button
                    onClick={() => shareProof(item.reference)}
                    className="p-2 hover:bg-gray-600 rounded-full transition-colors"
                    title="Copy shareable link"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </>
  );
};