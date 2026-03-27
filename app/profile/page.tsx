"use client";

import { useAuth } from "@/lib/auth/context";
import { useRouter } from "next/navigation";

function getInitials(nickname: string) {
  return nickname.slice(0, 2).toUpperCase();
}

export default function ProfilePage() {
  const { user, profile, loading, signOut } = useAuth();
  const router = useRouter();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || !profile) {
    router.replace("/auth/login");
    return null;
  }

  async function handleSignOut() {
    await signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="max-w-lg mx-auto px-4 py-12">
        {/* 상단 뒤로가기 */}
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
          {/* 아바타 */}
          <div className="flex flex-col items-center mb-8">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.nickname}
                className="w-20 h-20 rounded-full object-cover border-4 border-indigo-100 dark:border-indigo-900"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-indigo-600 flex items-center justify-center text-white text-2xl font-bold border-4 border-indigo-100 dark:border-indigo-900">
                {getInitials(profile.nickname)}
              </div>
            )}
            <h1 className="text-xl font-bold text-slate-900 dark:text-white mt-3">{profile.nickname}</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{user.email}</p>
          </div>

          {/* 정보 */}
          <div className="space-y-3 mb-8">
            <div className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-slate-700">
              <span className="text-sm text-slate-500 dark:text-slate-400">이메일</span>
              <span className="text-sm font-medium text-slate-800 dark:text-white">{user.email}</span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-slate-700">
              <span className="text-sm text-slate-500 dark:text-slate-400">닉네임</span>
              <span className="text-sm font-medium text-slate-800 dark:text-white">{profile.nickname}</span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-slate-700">
              <span className="text-sm text-slate-500 dark:text-slate-400">이메일 인증</span>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                user.email_confirmed_at
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
              }`}>
                {user.email_confirmed_at ? "완료" : "미완료"}
              </span>
            </div>
          </div>

          {/* 버튼들 */}
          <div className="space-y-2.5">
            <button
              onClick={() => router.push("/profile/verify")}
              className="w-full py-2.5 rounded-lg border border-indigo-200 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400 text-sm font-medium hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
            >
              프로필 수정
            </button>
            <button
              onClick={handleSignOut}
              className="w-full py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              로그아웃
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
