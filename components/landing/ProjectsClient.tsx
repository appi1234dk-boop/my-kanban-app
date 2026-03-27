"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Project } from "@/lib/types";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/context";
import { toggleProjectStar, deleteProject, createProject, updateProjectStatus, upsertMemberForUser, linkMemberToProject } from "@/lib/supabase/queries";
import ProjectSection from "./ProjectSection";
import CreateProjectModal from "./CreateProjectModal";

interface Props {
  initialProjects: Project[];
}

function getInitials(nickname: string) {
  return nickname.slice(0, 2).toUpperCase();
}

export default function ProjectsClient({ initialProjects }: Props) {
  const { user, profile, signOut, loading } = useAuth();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [myProjectsOnly, setMyProjectsOnly] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  async function handleToggleStar(id: string) {
    const project = projects.find((p) => p.id === id);
    if (!project) return;
    const newValue = !project.is_starred;
    setProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, is_starred: newValue } : p))
    );
    await toggleProjectStar(supabase, id, newValue);
  }

  async function handleDeleteProject(id: string) {
    setProjects((prev) => prev.filter((p) => p.id !== id));
    await deleteProject(supabase, id);
  }

  async function handleCreateProject(title: string, description: string) {
    const newProject = await createProject(supabase, {
      title,
      description,
      owner_id: user?.id,
    });

    // 생성자를 프로젝트 멤버로 자동 등록
    if (user && profile) {
      try {
        const member = await upsertMemberForUser(supabase, user.id, profile);
        await linkMemberToProject(supabase, newProject.id, member.id);
        newProject.members = [member];
      } catch {
        // 멤버 등록 실패해도 프로젝트 생성은 성공으로 처리
      }
    }

    setProjects((prev) => [newProject, ...prev]);
    setCreateModalOpen(false);
  }

  async function handleStatusChange(id: string, status: Project["status"]) {
    setProjects((prev) =>
      prev.map((p) => p.id === id ? { ...p, status, is_ended: status === "종료" } : p)
    );
    await updateProjectStatus(supabase, id, status);
  }

  async function handleSignOut() {
    setUserMenuOpen(false);
    await signOut();
    router.refresh();
  }

  // 필터링
  let filtered = projects;
  if (searchQuery) {
    filtered = filtered.filter((p) => p.title.toLowerCase().includes(searchQuery.toLowerCase()));
  }
  if (myProjectsOnly && user) {
    filtered = filtered.filter(
      (p) => p.owner_id === user.id
    );
  }
  const starredProjects = filtered.filter((p) => p.is_starred && !p.is_ended);
  const allProjects = filtered.filter((p) => !p.is_ended);
  const endedProjects = filtered.filter((p) => p.is_ended);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
              </svg>
            </div>
            <span className="font-semibold text-slate-900 dark:text-white text-base tracking-tight">
              Kanban
            </span>
          </div>
          <div className="flex items-center gap-3">
            {/* 검색 */}
            <div className="relative">
              <svg className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                type="text"
                placeholder="프로젝트 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-1.5 text-sm bg-slate-100 dark:bg-slate-800 border border-transparent focus:border-indigo-400 focus:bg-white dark:focus:bg-slate-700 rounded-lg outline-none transition-all w-44 text-slate-700 dark:text-slate-300 placeholder-slate-400"
              />
            </div>

            {!loading && (
              user ? (
                <>
                  {/* 내 프로젝트만 필터 */}
                  <button
                    onClick={() => setMyProjectsOnly((v) => !v)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                      myProjectsOnly
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-300"
                    }`}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                    </svg>
                    내 프로젝트
                  </button>

                  {/* 새 프로젝트 */}
                  <button
                    onClick={() => setCreateModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors shadow-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    새 프로젝트
                  </button>

                  {/* 유저 메뉴 */}
                  <div className="relative">
                    <button
                      onClick={() => setUserMenuOpen((v) => !v)}
                      className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                    >
                      {profile?.avatar_url ? (
                        <img
                          src={profile.avatar_url}
                          alt={profile.nickname}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                          {getInitials(profile?.nickname ?? "?")}
                        </div>
                      )}
                    </button>
                    {userMenuOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setUserMenuOpen(false)}
                        />
                        <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg z-20 overflow-hidden py-1">
                          <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-700">
                            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">{profile?.nickname}</p>
                            <p className="text-xs text-slate-400 truncate">{user.email}</p>
                          </div>
                          <Link
                            href="/profile"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                            </svg>
                            프로필
                          </Link>
                          <button
                            onClick={handleSignOut}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                            </svg>
                            로그아웃
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </>
              ) : (
                /* 비로그인 */
                <div className="flex items-center gap-2">
                  <Link
                    href="/auth/login"
                    className="px-3 py-1.5 rounded-lg text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    로그인
                  </Link>
                  <Link
                    href="/auth/signup"
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors"
                  >
                    회원가입
                  </Link>
                </div>
              )
            )}
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-7xl mx-auto px-6 py-10">
        <div className="mb-10">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">프로젝트</h1>
          {myProjectsOnly && (
            <p className="text-sm text-indigo-600 dark:text-indigo-400">내 프로젝트만 표시 중</p>
          )}
        </div>

        <div className="space-y-10">
          {starredProjects.length > 0 && (
            <ProjectSection
              title="관심있는 프로젝트"
              projects={starredProjects}
              onToggleStar={handleToggleStar}
              onDelete={handleDeleteProject}
              onStatusChange={handleStatusChange}
              emptyMessage="즐겨찾기한 프로젝트가 없습니다."
              currentUserId={user?.id}
            />
          )}

          <ProjectSection
            title="전체 프로젝트"
            projects={allProjects}
            onToggleStar={handleToggleStar}
            onDelete={handleDeleteProject}
            onStatusChange={handleStatusChange}
            emptyMessage="진행중인 프로젝트가 없습니다."
            currentUserId={user?.id}
          />

          <ProjectSection
            title="종료된 프로젝트"
            projects={endedProjects}
            onToggleStar={handleToggleStar}
            onDelete={handleDeleteProject}
            onStatusChange={handleStatusChange}
            collapsible
            defaultCollapsed
            emptyMessage="종료된 프로젝트가 없습니다."
            currentUserId={user?.id}
          />
        </div>
      </main>

      {createModalOpen && (
        <CreateProjectModal
          onSubmit={handleCreateProject}
          onClose={() => setCreateModalOpen(false)}
        />
      )}
    </div>
  );
}
