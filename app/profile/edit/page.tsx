"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/context";
import { supabase } from "@/lib/supabase/client";
import { updateProfile, updateMemberAvatarForUser } from "@/lib/supabase/queries";

function getInitials(nickname: string) {
  return nickname.slice(0, 2).toUpperCase();
}

export default function ProfileEditPage() {
  const { user, profile, refreshProfile } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [nickname, setNickname] = useState(profile?.nickname ?? "");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile?.avatar_url ?? null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 비밀번호 변경 상태
  const [pwSectionOpen, setPwSectionOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState(false);

  useEffect(() => {
    // 비밀번호 검증을 거치지 않은 경우 차단
    const verified = sessionStorage.getItem("profile_verified");
    if (!verified) {
      router.replace("/profile/verify");
    }
  }, [router]);

  useEffect(() => {
    if (profile) {
      setNickname(profile.nickname);
      setAvatarPreview(profile.avatar_url);
    }
  }, [profile]);

  if (!user || !profile) return null;

  const currentUser = user;
  const currentProfile = profile;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError("이미지 크기는 2MB 이하여야 합니다.");
      return;
    }
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
    setError("");
  }

  async function handleChangePassword() {
    if (!newPassword.trim()) {
      setPwError("새 비밀번호를 입력해주세요.");
      return;
    }
    if (newPassword.length < 6) {
      setPwError("비밀번호는 6자 이상이어야 합니다.");
      return;
    }
    setPwError("");
    setPwLoading(true);
    setPwSuccess(false);
    try {
      // 현재 비밀번호로 재인증
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: currentUser.email!,
        password: currentPassword,
      });
      if (signInError) {
        setPwError("현재 비밀번호가 올바르지 않습니다.");
        return;
      }
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;
      setPwSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setPwSectionOpen(false);
    } catch {
      setPwError("비밀번호 변경에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setPwLoading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!nickname.trim()) {
      setError("닉네임을 입력해주세요.");
      return;
    }
    setError("");
    setLoading(true);

    try {
      let avatarUrl = currentProfile.avatar_url;

      if (avatarFile) {
        const ext = avatarFile.name.split(".").pop();
        const fileName = `${currentUser.id}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(fileName, avatarFile, { upsert: true, contentType: avatarFile.type });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("avatars")
          .getPublicUrl(fileName);
        avatarUrl = publicUrl;
      }

      await updateProfile(supabase, currentUser.id, {
        nickname: nickname.trim(),
        avatar_url: avatarUrl,
      });

      await updateMemberAvatarForUser(
        supabase,
        currentUser.id,
        avatarUrl ?? nickname.trim().slice(0, 2).toUpperCase()
      );

      await refreshProfile();
      sessionStorage.removeItem("profile_verified");
      router.push("/profile");
    } catch {
      setError("저장에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="max-w-lg mx-auto px-4 py-12">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 mb-8 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          돌아가기
        </button>

        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-8">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-6">프로필 수정</h1>

          <form onSubmit={handleSave} className="space-y-6">
            {/* 아바타 */}
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt="프로필 이미지"
                    className="w-20 h-20 rounded-full object-cover border-4 border-indigo-100 dark:border-indigo-900"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-indigo-600 flex items-center justify-center text-white text-2xl font-bold border-4 border-indigo-100 dark:border-indigo-900">
                    {getInitials(nickname || profile.nickname)}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-1 -right-1 w-7 h-7 bg-white dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 rounded-full flex items-center justify-center text-slate-500 hover:text-indigo-600 transition-colors shadow-sm"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                  </svg>
                </button>
              </div>
              <p className="text-xs text-slate-400">JPG, PNG (최대 2MB)</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            {/* 닉네임 */}
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                닉네임 <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                required
                maxLength={20}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-800 dark:text-white outline-none focus:border-indigo-400 transition-colors"
              />
            </div>

            {/* 비밀번호 변경 */}
            <div className="border-t border-slate-100 dark:border-slate-700 pt-5">
              <button
                type="button"
                onClick={() => { setPwSectionOpen((v) => !v); setPwError(""); setPwSuccess(false); }}
                className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
                비밀번호 변경
                <svg className={`w-4 h-4 transition-transform ${pwSectionOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </button>

              {pwSectionOpen && (
                <div className="mt-4 space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                      현재 비밀번호
                    </label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-800 dark:text-white outline-none focus:border-indigo-400 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                      새 비밀번호 <span className="text-slate-400">(6자 이상)</span>
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-800 dark:text-white outline-none focus:border-indigo-400 transition-colors"
                    />
                  </div>
                  {pwError && (
                    <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
                      {pwError}
                    </p>
                  )}
                  {pwSuccess && (
                    <p className="text-xs text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg px-3 py-2">
                      비밀번호가 변경되었습니다.
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={handleChangePassword}
                    disabled={pwLoading}
                    className="w-full py-2.5 rounded-lg bg-slate-700 hover:bg-slate-800 dark:bg-slate-600 dark:hover:bg-slate-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors"
                  >
                    {pwLoading ? "변경 중..." : "비밀번호 변경"}
                  </button>
                </div>
              )}
            </div>

            {error && (
              <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => router.back()}
                className="flex-1 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors"
              >
                {loading ? "저장 중..." : "저장"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
