"use client";

import Link from "next/link";
import { Project, Member } from "@/lib/types";
import MemberAvatar from "@/components/ui/MemberAvatar";

interface Props {
  projects: Project[];
  currentProjectId?: string;
  projectMembers?: Member[];
  ownerId?: string | null;
  currentUserId?: string | null;
  onRemoveMember?: (memberId: string) => void;
  selectedMemberIds?: string[];
  onMemberFilter?: (memberId: string) => void;
  onClearMemberFilter?: () => void;
}

const PROJECT_ICON_COLORS = [
  "#6366f1", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6",
  "#3b82f6", "#ec4899", "#f97316",
];

function getProjectColor(index: number): string {
  return PROJECT_ICON_COLORS[index % PROJECT_ICON_COLORS.length];
}

export default function AppSidebar({ projects, currentProjectId, projectMembers, ownerId, currentUserId, onRemoveMember, selectedMemberIds, onMemberFilter, onClearMemberFilter }: Props) {
  const activeProjects = projects.filter((p) => !p.is_ended);

  return (
    <aside className="w-60 shrink-0 h-screen bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col">
      {/* Logo */}
      <div className="px-5 h-16 flex items-center border-b border-slate-100 dark:border-slate-800">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shrink-0">
            <svg className="w-4.5 h-4.5 text-white w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
            </svg>
          </div>
          <span className="font-bold text-slate-900 dark:text-white text-base tracking-tight">Kanban</span>
        </Link>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto py-4 px-3">
        {/* Projects Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between px-2 mb-2">
            <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Projects
            </span>
          </div>

          <nav className="space-y-0.5">
            {activeProjects.map((project, index) => {
              const isActive = project.id === currentProjectId;
              const color = getProjectColor(index);
              return (
                <Link
                  key={project.id}
                  href={`/project/${project.id}`}
                  className={`flex items-center gap-3 px-2 py-2 rounded-lg transition-colors group ${
                    isActive
                      ? "bg-indigo-50 dark:bg-indigo-900/30"
                      : "hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                >
                  <div
                    className="w-6 h-6 rounded-md flex items-center justify-center text-white text-xs font-bold shrink-0"
                    style={{ backgroundColor: color }}
                  >
                    {project.title.charAt(0)}
                  </div>
                  <span
                    className={`text-sm truncate font-medium ${
                      isActive
                        ? "text-indigo-700 dark:text-indigo-300"
                        : "text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white"
                    }`}
                  >
                    {project.title}
                  </span>
                  {project.is_starred && (
                    <svg className="w-3 h-3 text-amber-400 shrink-0 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Team Members Section */}
        {projectMembers && projectMembers.length > 0 && (
          <div>
            <div className="flex items-center justify-between px-2 mb-2">
              <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Team members
              </span>
              {selectedMemberIds && selectedMemberIds.length > 0 && onClearMemberFilter && (
                <button
                  type="button"
                  onClick={onClearMemberFilter}
                  className="text-xs text-indigo-500 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-200 font-medium transition-colors"
                >
                  전체
                </button>
              )}
            </div>
            <div className="space-y-1">
              {projectMembers.map((member) => {
                const isSelected = selectedMemberIds?.includes(member.id) ?? false;
                return (
                  <div
                    key={member.id}
                    className={`flex items-center gap-3 px-2 py-1.5 rounded-lg group transition-colors ${
                      onMemberFilter ? "cursor-pointer" : ""
                    } ${
                      isSelected
                        ? "bg-indigo-50 dark:bg-indigo-900/30"
                        : onMemberFilter ? "hover:bg-slate-50 dark:hover:bg-slate-800" : ""
                    }`}
                    onClick={() => onMemberFilter?.(member.id)}
                  >
                    <div className="relative w-7 h-7 shrink-0">
                      <MemberAvatar member={member} size="sm" />
                      {isSelected && (
                        <div
                          className="absolute inset-0 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: `${member.color}CC` }}
                        >
                          <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                          </svg>
                        </div>
                      )}
                      <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 border-2 border-white dark:border-slate-900 rounded-full" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-medium truncate ${
                        isSelected
                          ? "text-indigo-700 dark:text-indigo-300"
                          : "text-slate-700 dark:text-slate-200"
                      }`}>
                        {member.name}
                      </p>
                    </div>
                    {onRemoveMember && member.user_id !== ownerId && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onRemoveMember(member.id); }}
                        title="멤버 제외"
                        className="opacity-0 group-hover:opacity-100 shrink-0 w-5 h-5 flex items-center justify-center rounded text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
