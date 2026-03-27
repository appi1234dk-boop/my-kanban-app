"use client";

import { useState, useRef, useEffect } from "react";
import { Project } from "@/lib/types";
import MemberAvatars from "./MemberAvatars";
import Link from "next/link";

type ProjectStatus = "대기" | "진행중" | "종료";

const STATUS_STYLES: Record<ProjectStatus, string> = {
  "대기": "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400",
  "진행중": "bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400",
  "종료": "bg-red-100 dark:bg-red-900/40 text-red-500 dark:text-red-400",
};

interface Props {
  project: Project;
  onToggleStar: (id: string) => void;
  onDelete?: (id: string) => void;
  onStatusChange?: (id: string, status: ProjectStatus) => void;
}

export default function ProjectCard({ project, onToggleStar, onDelete, onStatusChange }: Props) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const totalCards = project.cards.length;
  const doneCards = project.cards.filter(
    (c) => project.columns.find((col) => col.id === c.column_id)?.status === "done"
  ).length;

  useEffect(() => {
    if (!statusOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setStatusOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [statusOpen]);

  return (
    <div className="relative group bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-md transition-all duration-200 cursor-pointer">
      {/* Action buttons (top-right) */}
      <div className="absolute top-3 right-3 flex items-center gap-1 z-10">
        {/* Delete button */}
        {onDelete && (
          confirmDelete ? (
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDelete(project.id);
                }}
                className="px-2 py-1 rounded-md bg-red-500 hover:bg-red-600 text-white text-xs font-medium transition-colors"
              >
                삭제
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setConfirmDelete(false);
                }}
                className="px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-medium transition-colors"
              >
                취소
              </button>
            </div>
          ) : (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setConfirmDelete(true);
              }}
              className="p-1.5 rounded-lg text-gray-300 dark:text-gray-600 hover:text-red-400 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
              title="프로젝트 삭제"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
            </button>
          )
        )}

        {/* Star button */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggleStar(project.id);
          }}
          className={`p-1.5 rounded-lg transition-all ${
            project.is_starred
              ? "text-amber-400 hover:text-amber-500"
              : "text-gray-300 dark:text-gray-600 hover:text-amber-400 opacity-0 group-hover:opacity-100"
          }`}
          title={project.is_starred ? "즐겨찾기 해제" : "즐겨찾기 추가"}
        >
          <svg
            className="w-5 h-5"
            fill={project.is_starred ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
            />
          </svg>
        </button>
      </div>

      <Link href={`/project/${project.id}`} className="block p-5">
        {/* Status badge */}
        <div className="mb-2" ref={dropdownRef}>
          <div className="relative inline-block">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (onStatusChange) setStatusOpen((prev) => !prev);
              }}
              className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full transition-colors ${STATUS_STYLES[project.status ?? "대기"]} ${onStatusChange ? "hover:opacity-80 cursor-pointer" : "cursor-default"}`}
            >
              {project.status ?? "대기"}
              {onStatusChange && (
                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              )}
            </button>

            {statusOpen && (
              <div className="absolute left-0 top-full mt-1 w-24 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20 overflow-hidden">
                {(["대기", "진행중", "종료"] as ProjectStatus[]).map((s) => (
                  <button
                    key={s}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onStatusChange!(project.id, s);
                      setStatusOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs font-medium transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 ${
                      project.status === s ? "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30" : "text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <h3 className="font-semibold text-gray-900 dark:text-white text-base mb-1 pr-16 leading-snug">
          {project.title}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 line-clamp-2 leading-relaxed">
          {project.description}
        </p>

        {/* Progress */}
        {totalCards > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500 mb-1">
              <span>진행도</span>
              <span>{doneCards}/{totalCards}</span>
            </div>
            <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5">
              <div
                className="bg-indigo-500 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${(doneCards / totalCards) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between">
          <MemberAvatars members={project.members} max={4} />
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {project.members.length}명 참여
          </span>
        </div>
      </Link>
    </div>
  );
}
