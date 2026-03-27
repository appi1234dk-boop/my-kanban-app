"use client";

import { useState } from "react";
import { Project } from "@/lib/types";
import ProjectCard from "./ProjectCard";

interface Props {
  title: string;
  projects: Project[];
  onToggleStar: (id: string) => void;
  onDelete?: (id: string) => void;
  onStatusChange?: (id: string, status: "대기" | "진행중" | "종료") => void;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  emptyMessage?: string;
  currentUserId?: string;
}

export default function ProjectSection({
  title,
  projects,
  onToggleStar,
  onDelete,
  onStatusChange,
  collapsible = false,
  defaultCollapsed = false,
  emptyMessage = "프로젝트가 없습니다.",
  currentUserId,
}: Props) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          {title}
        </h2>
        <span className="text-xs font-medium text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 rounded-full px-2 py-0.5">
          {projects.length}
        </span>
        {collapsible && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="ml-auto flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <svg
              className={`w-4 h-4 transition-transform duration-200 ${collapsed ? "-rotate-90" : ""}`}
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
            {collapsed ? "펼치기" : "접기"}
          </button>
        )}
      </div>

      {!collapsed && (
        <>
          {projects.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 py-4">{emptyMessage}</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {projects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onToggleStar={onToggleStar}
                  onDelete={currentUserId && project.owner_id === currentUserId ? onDelete : undefined}
                  onStatusChange={currentUserId && project.owner_id === currentUserId ? onStatusChange : undefined}
                />
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
