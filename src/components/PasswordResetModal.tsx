import { useState } from 'react';
import { authAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

interface PasswordResetModalProps {
  isOpen: boolean;
  userEmail: string;
  onClose: () => void;
}

export default function PasswordResetModal({ isOpen, userEmail, onClose }: PasswordResetModalProps) {
  const { account, setAuth } = useAuthStore();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Please fill in all fields');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (currentPassword === newPassword) {
      toast.error('New password must be different from current password');
      return;
    }

    setLoading(true);
    try {
      const response = await authAPI.resetPasswordFirstLogin({
        email: userEmail,
        currentPassword,
        newPassword,
      });

      if (response.data.token && response.data.institution) {
        // Update auth with new token and updated institution (mustResetPassword should be false now)
        const updatedInstitution = {
          ...response.data.institution,
          mustResetPassword: false,
        };
        setAuth(response.data.token, updatedInstitution);
        toast.success('Password reset successfully!');
        
        // Clear form and close modal
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        onClose();
        
        // Clear temporary password from session storage
        sessionStorage.removeItem('temp_current_password');
        sessionStorage.removeItem('temp_user_email');
      } else {
        toast.error('Password reset failed: Invalid response');
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6 border-2 border-primary">
        <div className="mb-6">
          <div className="flex items-center mb-3">
            <div className="bg-amber-100 rounded-full p-2 mr-3">
              <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Password Reset Required</h2>
          </div>
          <p className="text-sm text-gray-600 ml-11">
            You must reset your password before continuing. Please create a new secure password.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Current Password
            </label>
            <input
              type="password"
              className="input-field w-full"
              placeholder="Enter your current password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              New Password
            </label>
            <input
              type="password"
              className="input-field w-full"
              placeholder="Enter new password (min 6 characters)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirm New Password
            </label>
            <input
              type="password"
              className="input-field w-full"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex-1"
            >
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </div>
        </form>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
          <p className="text-xs text-blue-800 text-center">
            <strong>Required Action:</strong> You must reset your password to continue using the system.
          </p>
        </div>
      </div>
    </div>
  );
}

