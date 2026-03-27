"use client";

import { useState } from "react";
import { Project, Member } from "@/lib/types";
import KanbanBoard from "@/components/board/KanbanBoard";
import MemberAvatars from "@/components/landing/MemberAvatars";
import MemberAvatar from "@/components/ui/MemberAvatar";
import AppSidebar from "@/components/layout/AppSidebar";
import { supabase } from "@/lib/supabase/client";
import { linkMemberToProject, unlinkMemberFromProject, removeMemberFromProjectCards } from "@/lib/supabase/queries";
import { useAuth } from "@/lib/auth/context";

interface MemberPickerModalProps {
  projectId: string;
  projectMembers: Member[];
  allMembers: Member[];
  onAdd: (member: Member) => void;
  onClose: () => void;
}

function MemberPickerModal({ projectId, projectMembers, allMembers, onAdd, onClose }: MemberPickerModalProps) {
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const projectMemberIds = new Set(projectMembers.map((m) => m.id));
  const filteredMembers = allMembers.filter(
    (m) =>
      !projectMemberIds.has(m.id) &&
      m.name.toLowerCase().includes(search.toLowerCase())
  );

  async function handleSelectMember(member: Member) {
    setLoading(true);
    try {
      await linkMemberToProject(supabase, projectId, member.id);
      onAdd(member);
    } catch (err) {
      console.error("멤버 연결 실패:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6">
        <h2 className="text-base font-semibold text-slate-800 dark:text-white mb-4">
          멤버 추가
        </h2>

        <div className="space-y-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="이름으로 검색"
            autoFocus
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-800 dark:text-white outline-none focus:border-indigo-400 transition-colors"
          />
          <div className="max-h-52 overflow-y-auto space-y-1">
            {filteredMembers.length === 0 ? (
              <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-6">
                {allMembers.length === 0
                  ? "등록된 회원이 없습니다."
                  : projectMemberIds.size === allMembers.length
                  ? "모든 회원이 이미 프로젝트에 참여 중입니다."
                  : "검색 결과가 없습니다."}
              </p>
            ) : (
              filteredMembers.map((member) => (
                <button
                  key={member.id}
                  type="button"
                  disabled={loading}
                  onClick={() => handleSelectMember(member)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                >
                  <MemberAvatar member={member} size="md" />
                  <span className="text-sm text-slate-700 dark:text-slate-200 font-medium text-left">
                    {member.name}
                  </span>
                </button>
              ))
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            취소
          </button>
        </div>
      </div>
    </div>
  );
}

interface Props {
  project: Project;
  allProjects: Project[];
  allMembers: Member[];
}

export default function BoardPageClient({ project: initialProject, allProjects, allMembers: initialAllMembers }: Props) {
  const { user } = useAuth();
  const [members, setMembers] = useState<Member[]>(initialProject.members);
  const [allMembers, setAllMembers] = useState<Member[]>(initialAllMembers);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [progress, setProgress] = useState(0);
  const [removedMemberIds, setRemovedMemberIds] = useState<string[]>([]);
  const [filterMemberIds, setFilterMemberIds] = useState<string[]>([]);

  function handleProgressChange(doneCards: number, excludedCards: number, totalCards: number) {
    const denominator = totalCards - excludedCards;
    setProgress(denominator > 0 ? Math.round((doneCards / denominator) * 100) : 0);
  }

  function handleToggleMemberFilter(memberId: string) {
    setFilterMemberIds((prev) =>
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]
    );
  }

  function handleAddMember(member: Member) {
    setMembers((prev) => [...prev, member]);
    setAllMembers((prev) => prev.some((m) => m.id === member.id) ? prev : [...prev, member]);
    setAddMemberOpen(false);
  }

  async function handleRemoveMember(memberId: string) {
    // 소유주는 제거 불가
    const member = members.find((m) => m.id === memberId);
    if (initialProject.owner_id && member?.user_id === initialProject.owner_id) return;

    try {
      await unlinkMemberFromProject(supabase, initialProject.id, memberId);
      await removeMemberFromProjectCards(supabase, initialProject.id, memberId);
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
      setRemovedMemberIds((prev) => [...prev, memberId]);
    } catch (err) {
      console.error("멤버 제외 실패:", err);
    }
  }

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 overflow-hidden">
      <AppSidebar
        projects={allProjects}
        currentProjectId={initialProject.id}
        projectMembers={members}
        ownerId={initialProject.owner_id}
        currentUserId={user?.id}
        onRemoveMember={handleRemoveMember}
        selectedMemberIds={filterMemberIds}
        onMemberFilter={handleToggleMemberFilter}
        onClearMemberFilter={() => setFilterMemberIds([])}
      />

      <div className="flex flex-col flex-1 min-w-0">
        <header className="shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1.5">
                <h1 className="text-lg font-bold text-slate-900 dark:text-white truncate">
                  {initialProject.title}
                </h1>
                {initialProject.is_ended && (
                  <span className="shrink-0 px-2 py-0.5 text-xs font-medium rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
                    종료됨
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 max-w-xs bg-slate-100 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 shrink-0">
                  {progress}% complete
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <MemberAvatars members={members} max={5} size="sm" />
              <button
                onClick={() => setAddMemberOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Add Member
              </button>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-hidden">
          <KanbanBoard
            project={{ ...initialProject, members }}
            initialTags={[]}
            onProgressChange={handleProgressChange}
            removedMemberIds={removedMemberIds}
            filterMemberIds={filterMemberIds}
          />
        </div>
      </div>

      {addMemberOpen && (
        <MemberPickerModal
          projectId={initialProject.id}
          projectMembers={members}
          allMembers={allMembers}
          onAdd={handleAddMember}
          onClose={() => setAddMemberOpen(false)}
        />
      )}
    </div>
  );
}
