"use client";

import { useState, useRef, useEffect } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, Column } from "@/lib/types";
import KanbanCard from "./KanbanCard";

const COLOR_PRESETS = [
  { color: "#94a3b8", label: "회색" },
  { color: "#3b82f6", label: "파랑" },
  { color: "#10b981", label: "초록" },
  { color: "#f59e0b", label: "노랑" },
  { color: "#f97316", label: "주황" },
  { color: "#8b5cf6", label: "보라" },
  { color: "#ef4444", label: "빨강" },
  { color: "#ec4899", label: "핑크" },
];

type ColumnStatus = "none" | "done" | "stopped";

interface Props {
  column: Column;
  cards: Card[];
  onCardClick: (card: Card) => void;
  onAddCard: (columnId: string) => void;
  onDeleteColumn: (columnId: string) => void;
  onRenameColumn: (columnId: string, title: string) => void;
  onColorChange: (columnId: string, color: string) => void;
  onStatusChange: (columnId: string, status: ColumnStatus) => void;
}

export default function KanbanColumn({
  column,
  cards,
  onCardClick,
  onAddCard,
  onDeleteColumn,
  onRenameColumn,
  onColorChange,
  onStatusChange,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [statusPickerOpen, setStatusPickerOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(column.title);
  const menuRef = useRef<HTMLDivElement>(null);
  const renameRef = useRef<HTMLInputElement>(null);

  const columnColor = column.color ?? "#94a3b8";

  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: column.id,
    data: { type: "column", column },
  });

  const {
    attributes,
    listeners,
    setNodeRef: setSortRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `col-${column.id}`,
    data: { type: "column", column },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  useEffect(() => {
    if (renaming && renameRef.current) renameRef.current.focus();
  }, [renaming]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
        setColorPickerOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const columnStatus = column.status ?? "none";

  function handleRenameSubmit() {
    if (renameValue.trim()) onRenameColumn(column.id, renameValue.trim());
    setRenaming(false);
  }

  return (
    <div ref={setSortRef} style={style} className="flex flex-col w-72 shrink-0">
      <div
        className={`flex flex-col bg-white dark:bg-slate-800 rounded-xl shadow-sm border transition-colors ${
          isOver
            ? "border-indigo-300 dark:border-indigo-600 shadow-md"
            : "border-slate-200 dark:border-slate-700"
        }`}
      >
        {/* Colored top accent bar */}
        <div
          className="h-1 rounded-t-xl"
          style={{ backgroundColor: columnColor }}
        />

        {/* Column header */}
        <div
          className="flex items-center justify-between px-3.5 pt-3 pb-2 cursor-grab active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: columnColor }}
            />
            {renaming ? (
              <input
                ref={renameRef}
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={handleRenameSubmit}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRenameSubmit();
                  if (e.key === "Escape") setRenaming(false);
                }}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                className="text-sm font-semibold bg-slate-50 dark:bg-slate-700 border border-indigo-400 rounded px-2 py-0.5 outline-none w-36 text-slate-800 dark:text-white"
              />
            ) : (
              <span
                className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate cursor-text hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                onClick={(e) => { e.stopPropagation(); setRenaming(true); setRenameValue(column.title); }}
                onMouseDown={(e) => e.stopPropagation()}
                title="클릭하여 이름 변경"
              >
                {column.title}
              </span>
            )}
            <span className="text-xs font-medium text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-700 rounded-full px-2 py-0.5 shrink-0">
              {cards.length}
            </span>
            {columnStatus === "done" && (
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 shrink-0">
                ✓ 완료
              </span>
            )}
            {columnStatus === "stopped" && (
              <span className="text-xs font-medium text-red-500 dark:text-red-400 shrink-0">
                ✕ 중단
              </span>
            )}
          </div>

          {/* Menu */}
          <div ref={menuRef} className="relative shrink-0" onMouseDown={(e) => e.stopPropagation()}>
            <button
              onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); setColorPickerOpen(false); setStatusPickerOpen(false); setDeleteConfirm(false); }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
              </svg>
            </button>

            {menuOpen && !colorPickerOpen && !statusPickerOpen && !deleteConfirm && (
              <div className="absolute right-0 top-8 z-20 w-44 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 py-1">
                <button
                  onClick={() => { setColorPickerOpen(true); setMenuOpen(false); }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  <span
                    className="w-4 h-4 rounded-full border border-slate-300 shrink-0"
                    style={{ backgroundColor: columnColor }}
                  />
                  색상 변경
                </button>
                <button
                  onClick={() => { setStatusPickerOpen(true); setMenuOpen(false); }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  유형 설정
                </button>
                <div className="my-1 border-t border-slate-100 dark:border-slate-700" />
                <button
                  onClick={() => { setDeleteConfirm(true); setMenuOpen(false); }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                  컬럼 삭제
                </button>
              </div>
            )}

            {/* Color picker submenu */}
            {colorPickerOpen && (
              <div className="absolute right-0 top-8 z-20 w-52 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 p-3">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">상태 색상 선택</p>
                <div className="grid grid-cols-4 gap-2">
                  {COLOR_PRESETS.map((preset) => (
                    <button
                      key={preset.color}
                      title={preset.label}
                      onClick={() => {
                        onColorChange(column.id, preset.color);
                        setColorPickerOpen(false);
                      }}
                      className={`w-8 h-8 rounded-full transition-all hover:scale-110 ${
                        columnColor === preset.color
                          ? "ring-2 ring-offset-2 ring-slate-400 dark:ring-offset-slate-800"
                          : ""
                      }`}
                      style={{ backgroundColor: preset.color }}
                    />
                  ))}
                </div>
                <button
                  onClick={() => setColorPickerOpen(false)}
                  className="mt-2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  취소
                </button>
              </div>
            )}

            {/* Delete confirm modal */}
            {deleteConfirm && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={() => setDeleteConfirm(false)}
              >
                <div
                  className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-7"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Icon */}
                  <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-5">
                    <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  </div>

                  <h3 className="text-base font-bold text-slate-800 dark:text-white text-center mb-2">
                    컬럼을 삭제할까요?
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 text-center mb-1">
                    <span className="font-semibold text-slate-700 dark:text-slate-200">"{column.title}"</span> 컬럼과
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 text-center mb-7">
                    포함된 카드{" "}
                    <span className="font-semibold text-red-500">{cards.length}개</span>가 영구 삭제됩니다.
                  </p>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setDeleteConfirm(false)}
                      className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                    >
                      취소
                    </button>
                    <button
                      onClick={() => { onDeleteColumn(column.id); setDeleteConfirm(false); }}
                      className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold bg-red-500 hover:bg-red-600 text-white transition-colors shadow-sm"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Status picker submenu */}
            {statusPickerOpen && (
              <div className="absolute right-0 top-8 z-20 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 py-1">
                <p className="text-xs font-medium text-slate-400 dark:text-slate-500 px-3 py-1.5">컬럼 유형 설정</p>
                {(
                  [
                    { value: "none", label: "일반", desc: "일반 진행 컬럼" },
                    { value: "done", label: "✓ 완료", desc: "완료율 분자에 포함" },
                    { value: "stopped", label: "✕ 중단", desc: "완료율 분모에서 제외" },
                  ] as { value: ColumnStatus; label: string; desc: string }[]
                ).map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      onStatusChange(column.id, opt.value);
                      setStatusPickerOpen(false);
                    }}
                    className={`flex items-center justify-between w-full px-3 py-2 text-sm transition-colors ${
                      columnStatus === opt.value
                        ? "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300"
                        : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                    }`}
                  >
                    <span>{opt.label}</span>
                    {columnStatus === opt.value && (
                      <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    )}
                  </button>
                ))}
                <div className="border-t border-slate-100 dark:border-slate-700 mt-1 pt-1">
                  <button
                    onClick={() => setStatusPickerOpen(false)}
                    className="w-full px-3 py-1.5 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-left"
                  >
                    취소
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Add card button — top of list */}
        <div className="px-3 pb-2">
          <button
            onClick={() => onAddCard(column.id)}
            className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all group border border-dashed border-slate-200 dark:border-slate-700"
          >
            <svg className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add New Task
          </button>
        </div>

        {/* Cards */}
        <div
          ref={setDropRef}
          className="flex-1 px-3 pb-3 space-y-2 min-h-[60px] overflow-y-auto"
        >
          <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
            {cards.map((card) => (
              <KanbanCard key={card.id} card={card} onClick={onCardClick} />
            ))}
          </SortableContext>
          {cards.length === 0 && (
            <div className="flex items-center justify-center h-16 rounded-lg border-2 border-dashed border-slate-100 dark:border-slate-700/50">
              <p className="text-xs text-slate-300 dark:text-slate-600">카드를 드래그하여 이동</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
