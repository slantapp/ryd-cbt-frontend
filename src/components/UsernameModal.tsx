import React from 'react';

interface UsernameModalProps {
  isOpen: boolean;
  username: string;
  onClose: () => void;
}

export default function UsernameModal({ isOpen, username, onClose }: UsernameModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 mb-4">
            <svg className="h-8 w-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome!</h2>
          <p className="text-gray-600 mb-4">
            Your username is:
          </p>
          
          <div className="bg-gray-50 border-2 border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-xl font-mono font-semibold text-blue-600 break-all">
              {username}
            </p>
          </div>
          
          <p className="text-sm text-gray-500 mb-6">
            Please save this username. You'll need it to log in to your account.
          </p>
          
          <button
            onClick={onClose}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
}




