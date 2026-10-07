"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Eye, EyeOff, AlertTriangle } from "lucide-react";
import { useI18n } from "@/components/providers/LanguageProvider";
import { capitalize } from "@/lib/formatters";

export default function ChangePasswordForm({ username }: { username: string }) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const { t } = useI18n();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!newPassword || !confirmPassword) {
      toast.error(t("Please fill in both fields"));
      return;
    }

    if (newPassword.length < 6) {
      toast.error(t("Password must be at least 6 characters"));
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error(t("Passwords do not match"));
      return;
    }

    // Show final warning before proceeding
    setShowWarning(true);
  };

  const handleConfirm = async () => {
    setLoading(true);
    setShowWarning(false);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword, confirmPassword }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success(t("Password changed successfully"));
      setNewPassword("");
      setConfirmPassword("");
    } catch (e: any) {
      toast.error(t(e.message || "Failed to change password"));
    } finally {
      setLoading(false);
    }
  };

  const passwordsMatch =
    newPassword && confirmPassword && newPassword === confirmPassword;
  const passwordsMismatch =
    newPassword && confirmPassword && newPassword !== confirmPassword;

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* New Password */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            {t('New Password')} <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type={showNew ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder={t('Enter new password')}
              className="w-full px-3 py-2 pr-10 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            <button
              type="button"
              onClick={() => setShowNew(!showNew)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {showNew ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-1">{t('Minimum 6 characters')}</p>
        </div>

        {/* Confirm Password */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            {t('Confirm New Password')} <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type={showConfirm ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={t('Re-enter new password')}
              className={`w-full px-3 py-2 pr-10 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                passwordsMismatch
                  ? "border-red-300 bg-red-50"
                  : passwordsMatch
                    ? "border-green-400 bg-green-50"
                    : "border-slate-300"
              }`}
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {showConfirm ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
          {passwordsMismatch && (
            <p className="text-xs text-red-600 mt-1">{t('Passwords do not match')}</p>
          )}
          {passwordsMatch && (
            <p className="text-xs text-green-600 mt-1">✓ {t('Passwords match')}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || !newPassword || !confirmPassword}
          className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed text-white font-medium rounded-lg text-sm transition-colors"
        >
          {t(loading ? "Changing..." : "Change Password")}
        </button>
      </form>

      {/* Final Warning Modal */}
      {showWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setShowWarning(false)}
          />

          {/* Dialog */}
          <div className="relative bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 z-10">
            {/* Warning icon */}
            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-amber-100 mx-auto mb-4">
              <AlertTriangle className="w-7 h-7 text-amber-600" />
            </div>

            <h3 className="text-lg font-bold text-slate-800 text-center mb-2">
              {t('Remember Your Password')}
            </h3>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-5">
              <p className="text-sm text-amber-800 text-center leading-relaxed">
                <strong>{t('Warning:')}</strong>{" "}
                {t('Make sure you remember this new password. If you forget it, you will not be able to log in and will need help from a technical person to reset it.')}
              </p>
            </div>

            <p className="text-xs text-slate-500 text-center mb-5">
              {t('Changing password for:')}{" "}
              <strong>{t(capitalize(username))}</strong>
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowWarning(false)}
                className="flex-1 py-2.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                {t('Cancel')}
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                {t('Yes, Change It')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
