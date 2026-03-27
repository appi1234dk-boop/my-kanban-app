"use client";

import { useState, useEffect, useRef } from "react";
import { Card, Column, Member, Tag, Comment, Attachment } from "@/lib/types";
import TagBadge from "./TagBadge";
import TiptapEditor from "./TiptapEditor";
import MemberAvatars from "@/components/landing/MemberAvatars";
import MemberAvatar from "@/components/ui/MemberAvatar";
import { useAuth } from "@/lib/auth/context";
import { supabase } from "@/lib/supabase/client";
import { createComment, deleteComment, addAttachment, deleteAttachment, getCardDetail } from "@/lib/supabase/queries";

interface Props {
  card: Card | null;
  columnId: string;
  columns: Column[];
  allTags: Tag[];
  allMembers: Member[];
  onSave: (card: Card, pendingFiles?: File[]) => void;
  onDelete: (cardId: string) => void;
  onSaveTag: (tag: Tag) => void;
  onClose: () => void;
}

const PRESET_COLORS = [
  "#ef4444", "#f97316", "#f59e0b", "#eab308",
  "#22c55e", "#10b981", "#14b8a6", "#06b6d4",
  "#3b82f6", "#6366f1", "#8b5cf6", "#ec4899",
];

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function CardModal({
  card,
  columnId,
  columns,
  allTags,
  allMembers,
  onSave,
  onDelete,
  onSaveTag,
  onClose,
}: Props) {
  const isEdit = !!card;

  const [title, setTitle] = useState(card?.title ?? "");
  const [description, setDescription] = useState(card?.description ?? "");
  const [body, setBody] = useState(card?.body ?? "");
  const [dueDate, setDueDate] = useState(card?.due_date ?? "");
  const [selectedTags, setSelectedTags] = useState<Tag[]>(card?.tags ?? []);
  const [assignee, setAssignee] = useState<Member | null>(card?.assignee ?? null);
  const [stakeholders, setStakeholders] = useState<Member[]>(card?.stakeholders ?? []);
  const [comments, setComments] = useState<Comment[]>(card?.comments ?? []);
  const [attachments, setAttachments] = useState<Attachment[]>(card?.attachments ?? []);
  const [detailLoading, setDetailLoading] = useState(isEdit);

  // Tag management
  const [tagPanelOpen, setTagPanelOpen] = useState(false);
  const [newTagTitle, setNewTagTitle] = useState("");
  const [newTagColor, setNewTagColor] = useState("#6366f1");

  // Member panel
  const [assigneePanelOpen, setAssigneePanelOpen] = useState(false);
  const [stakeholderPanelOpen, setStakeholderPanelOpen] = useState(false);
  const assigneePanelRef = useRef<HTMLDivElement>(null);
  const stakeholderPanelRef = useRef<HTMLDivElement>(null);

  // 새 카드용 pending 파일 (아직 카드 ID가 없어서 DB에 못 넣는 파일들)
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  // Comment input
  const [commentInput, setCommentInput] = useState("");

  // Delete confirm
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const { user, profile } = useAuth();
  const overlayRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  useEffect(() => {
    if (!isEdit || !card) return;
    let cancelled = false;
    setDetailLoading(true);
    getCardDetail(supabase, card.id)
      .then(({ comments, attachments }) => {
        if (cancelled) return;
        setComments(comments);
        setAttachments(attachments);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setDetailLoading(false); });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card?.id]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (assigneePanelRef.current && !assigneePanelRef.current.contains(e.target as Node)) {
        setAssigneePanelOpen(false);
      }
      if (stakeholderPanelRef.current && !stakeholderPanelRef.current.contains(e.target as Node)) {
        setStakeholderPanelOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSave() {
    if (!title.trim()) return;
    const now = new Date().toISOString();
    const saved: Card = {
      id: card?.id ?? crypto.randomUUID(),
      column_id: columnId,
      title: title.trim(),
      description: description.trim(),
      body,
      due_date: dueDate || null,
      assignee,
      stakeholders,
      tags: selectedTags,
      position: card?.position ?? Math.floor(Date.now() / 1000),
      created_at: card?.created_at ?? now,
      comments,
      attachments,
    };
    onSave(saved, pendingFiles.length > 0 ? pendingFiles : undefined);
  }

  function toggleTag(tag: Tag) {
    setSelectedTags((prev) =>
      prev.find((t) => t.id === tag.id)
        ? prev.filter((t) => t.id !== tag.id)
        : [...prev, tag]
    );
  }

  function handleAddTag() {
    if (!newTagTitle.trim()) return;
    const tag: Tag = {
      id: crypto.randomUUID(),
      title: newTagTitle.trim(),
      color: newTagColor,
    };
    onSaveTag(tag);
    setSelectedTags((prev) => [...prev, tag]);
    setNewTagTitle("");
    setNewTagColor("#6366f1");
  }

  function toggleStakeholder(member: Member) {
    setStakeholders((prev) =>
      prev.find((m) => m.id === member.id)
        ? prev.filter((m) => m.id !== member.id)
        : [...prev, member]
    );
  }

  async function handleAddComment() {
    if (!commentInput.trim() || !user || !profile || !card) return;
    const content = commentInput.trim();
    setCommentInput("");
    try {
      const newComment = await createComment(supabase, card.id, user.id, content);
      setComments((prev) => [...prev, newComment]);
    } catch {
      setCommentInput(content); // 실패 시 복원
    }
  }

  async function handleDeleteComment(commentId: string) {
    setComments((prev) => prev.filter((c) => c.id !== commentId));
    try {
      await deleteComment(supabase, commentId);
    } catch {
      // 실패 시 무시 (이미 UI에서 제거됨)
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    const fileArray = Array.from(files);

    if (isEdit && card) {
      // 기존 카드: 즉시 Storage 업로드 + DB 저장
      for (const file of fileArray) {
        const tempId = `att-${Date.now()}-${Math.random()}`;
        const ext = file.name.split(".").pop();
        const storagePath = `${card.id}/${tempId}.${ext}`;
        try {
          const { error: uploadError } = await supabase.storage
            .from("card-attachments")
            .upload(storagePath, file, { contentType: file.type });
          if (uploadError) throw uploadError;
          const { data: { publicUrl } } = supabase.storage
            .from("card-attachments")
            .getPublicUrl(storagePath);
          const saved = await addAttachment(supabase, card.id, file.name, file.size, publicUrl);
          setAttachments((prev) => [...prev, { ...saved, url: saved.url ?? "" }]);
        } catch {
          // 업로드 실패 시 무시
        }
      }
    } else {
      // 새 카드: 파일 객체만 보관, 저장 시 업로드
      fileArray.forEach((file) => {
        const tempId = `pending-${Date.now()}-${Math.random()}`;
        setPendingFiles((prev) => [...prev, file]);
        setAttachments((prev) => [...prev, {
          id: tempId,
          name: file.name,
          size: file.size,
          url: "",
          created_at: new Date().toISOString(),
        }]);
      });
    }

    e.target.value = "";
  }

  async function handleDownload(url: string, name: string) {
    const res = await fetch(url);
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = name;
    a.click();
    URL.revokeObjectURL(blobUrl);
  }

  async function handleDeleteAttachment(attachmentId: string) {
    setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
    // pending 파일인 경우 (새 카드 생성 중)
    if (attachmentId.startsWith("pending-")) {
      const idx = attachments.findIndex((a) => a.id === attachmentId);
      if (idx !== -1) setPendingFiles((prev) => prev.filter((_, i) => i !== idx));
      return;
    }
    // 기존 DB 첨부파일: DB 삭제
    try {
      await deleteAttachment(supabase, attachmentId);
    } catch {
      // 무시
    }
  }

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-700">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 shrink-0">
          <h2 className="text-base font-semibold text-slate-800 dark:text-white">
            {isEdit ? "카드 상세" : "카드 추가"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-6">

          {/* ── 2단 영역 ─────────────────────────────────────────────── */}
          <div className="flex gap-6 items-start">

            {/* LEFT: 타이틀 · 설명 · 본문 */}
            <div className="flex-1 min-w-0 space-y-5">
              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  타이틀 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="카드 제목을 입력하세요"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-sm outline-none focus:border-indigo-400 transition-colors placeholder-slate-400"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  설명
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="한 줄 요약"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-sm outline-none focus:border-indigo-400 transition-colors placeholder-slate-400"
                />
              </div>

              {/* Body (Tiptap) */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  본문
                </label>
                <TiptapEditor
                  content={body}
                  onChange={setBody}
                  placeholder="세부 내용을 입력하세요. Bold, Underline, 체크박스 등을 사용할 수 있습니다."
                />
              </div>
            </div>

            {/* RIGHT: 담당자 · 유관자 · 태그 · 완료기한 */}
            <div className="w-64 shrink-0 space-y-5 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4">
              {/* Assignee */}
              <div ref={assigneePanelRef} className="relative">
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  담당자
                </label>
                <div className="flex items-center gap-2">
                  {assignee ? (
                    <MemberAvatars members={[assignee]} size="sm" max={1} />
                  ) : (
                    <div className="w-7 h-7 rounded-full border-2 border-dashed border-slate-300 dark:border-slate-600" />
                  )}
                  <button
                    type="button"
                    onClick={() => setAssigneePanelOpen((v) => !v)}
                    className="w-7 h-7 rounded-full border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center text-slate-400 hover:border-indigo-400 hover:text-indigo-500 dark:hover:border-indigo-400 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                  </button>
                </div>
                {assigneePanelOpen && (
                  <div className="absolute top-full left-0 mt-1.5 w-52 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg z-50 py-1.5 overflow-hidden">
                    {allMembers.map((member) => (
                      <label
                        key={member.id}
                        className="flex items-center gap-2.5 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/60 cursor-pointer"
                      >
                        <input
                          type="radio"
                          name="assignee"
                          checked={assignee?.id === member.id}
                          onChange={() => setAssignee(assignee?.id === member.id ? null : member)}
                          onClick={() => { if (assignee?.id === member.id) setAssignee(null); }}
                          className="sr-only"
                        />
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${assignee?.id === member.id ? "border-indigo-500 bg-indigo-500" : "border-slate-300 dark:border-slate-500"}`}>
                          {assignee?.id === member.id && (
                            <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                            </svg>
                          )}
                        </div>
                        <MemberAvatar member={member} size="xs" />
                        <span className="text-sm text-slate-700 dark:text-slate-200 truncate">{member.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Stakeholders */}
              <div ref={stakeholderPanelRef} className="relative">
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  유관자
                </label>
                <div className="flex items-center gap-2">
                  {stakeholders.length > 0 && (
                    <MemberAvatars members={stakeholders} size="sm" max={4} />
                  )}
                  <button
                    type="button"
                    onClick={() => setStakeholderPanelOpen((v) => !v)}
                    className="w-7 h-7 rounded-full border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center text-slate-400 hover:border-emerald-400 hover:text-emerald-500 dark:hover:border-emerald-400 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                  </button>
                </div>
                {stakeholderPanelOpen && (
                  <div className="absolute top-full left-0 mt-1.5 w-52 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg z-50 py-1.5 overflow-hidden">
                    {allMembers.map((member) => {
                      const selected = !!stakeholders.find((m) => m.id === member.id);
                      return (
                        <label
                          key={member.id}
                          className="flex items-center gap-2.5 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/60 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => toggleStakeholder(member)}
                            className="sr-only"
                          />
                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${selected ? "border-emerald-500 bg-emerald-500" : "border-slate-300 dark:border-slate-500"}`}>
                            {selected && (
                              <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                              </svg>
                            )}
                          </div>
                          <MemberAvatar member={member} size="xs" />
                          <span className="text-sm text-slate-700 dark:text-slate-200 truncate">{member.name}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Tags */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  태그
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {allTags.map((tag) => {
                    const selected = selectedTags.find((t) => t.id === tag.id);
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        className={`rounded-full transition-all ${
                          selected ? "scale-105" : "opacity-60 hover:opacity-80"
                        }`}
                      >
                        <TagBadge tag={tag} size="sm" selected={!!selected} />
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => setTagPanelOpen(!tagPanelOpen)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs text-slate-500 dark:text-slate-400 border border-dashed border-slate-300 dark:border-slate-600 hover:border-indigo-400 hover:text-indigo-500 transition-colors"
                  >
                    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    새 태그
                  </button>
                </div>
                {tagPanelOpen && (
                  <div className="flex flex-col gap-2 p-2.5 bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600">
                    <div className="flex gap-1.5 flex-wrap">
                      {PRESET_COLORS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setNewTagColor(color)}
                          className={`w-4 h-4 rounded-full transition-transform ${
                            newTagColor === color ? "scale-125 ring-2 ring-offset-1 ring-slate-400" : ""
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={newTagTitle}
                        onChange={(e) => setNewTagTitle(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter" && !e.nativeEvent.isComposing) handleAddTag(); }}
                        placeholder="태그 이름"
                        className="flex-1 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-500 bg-white dark:bg-slate-600 text-xs text-slate-700 dark:text-slate-300 outline-none focus:border-indigo-400 min-w-0"
                      />
                      <button
                        type="button"
                        onClick={handleAddTag}
                        className="px-2 py-1 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium transition-colors shrink-0"
                      >
                        추가
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Due date */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  완료기한
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white text-sm outline-none focus:border-indigo-400 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* ── 전체폭 영역: 첨부파일 · 댓글 ────────────────────────── */}
          <div className="space-y-6">
          {/* ── Attachments ─────────────────────────────────────────── */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                첨부파일 {attachments.length > 0 && <span className="normal-case font-normal">({attachments.length})</span>}
              </label>
              <label className="cursor-pointer flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors border border-indigo-200 dark:border-indigo-800">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                파일 첨부
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
            </div>

            {detailLoading ? (
              <div className="space-y-1.5 animate-pulse">
                {[1, 2].map((i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                    <div className="w-4 h-4 rounded bg-slate-200 dark:bg-slate-700 shrink-0" />
                    <div className="flex-1 space-y-1">
                      <div className="h-3 w-32 bg-slate-200 dark:bg-slate-700 rounded" />
                      <div className="h-2.5 w-16 bg-slate-200 dark:bg-slate-700 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : attachments.length > 0 ? (
              <div className="space-y-1.5">
                {attachments.map((att) => (
                  <div
                    key={att.id}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700"
                  >
                    <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
                    </svg>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-700 dark:text-slate-300 truncate">{att.name}</p>
                      <p className="text-xs text-slate-400">{formatFileSize(att.size)}</p>
                    </div>
                    {att.url && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleDownload(att.url, att.name); }}
                        className="p-1 rounded text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors shrink-0"
                        title="다운로드"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                        </svg>
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteAttachment(att.id)}
                      className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shrink-0"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center py-6 rounded-lg border-2 border-dashed border-slate-200 dark:border-slate-700">
                <p className="text-xs text-slate-400 dark:text-slate-500">첨부된 파일이 없습니다</p>
              </div>
            )}
          </div>

          {/* ── Comments: 카드 상세(수정)에서만 표시 ──────────────── */}
          {isEdit && <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
              댓글 {comments.length > 0 && <span className="normal-case font-normal">({comments.length})</span>}
            </label>

            {/* Loading skeleton */}
            {detailLoading && (
              <div className="space-y-3 mb-4 animate-pulse">
                {[1, 2].map((i) => (
                  <div key={i} className="flex gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 w-24 bg-slate-200 dark:bg-slate-700 rounded" />
                      <div className="h-3 w-full bg-slate-200 dark:bg-slate-700 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Comment list */}
            {!detailLoading && comments.length > 0 && (
              <div className="space-y-3 mb-4">
                {comments.map((comment) => (
                  <div key={comment.id} className="flex gap-2.5">
                    {comment.author.avatar_url ? (
                      <img
                        src={comment.author.avatar_url}
                        alt={comment.author.nickname}
                        className="w-7 h-7 rounded-full object-cover shrink-0 mt-0.5"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-semibold shrink-0 mt-0.5">
                        {comment.author.nickname.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 mb-0.5">
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                          {comment.author.nickname}
                        </span>
                        <span className="text-xs text-slate-400">{formatTime(comment.created_at)}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <p className="flex-1 text-sm text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800 rounded-lg px-3 py-2">
                          {comment.content}
                        </p>
                        {user?.id === comment.author.id && (
                          <button
                            onClick={() => handleDeleteComment(comment.id)}
                            className="p-1 rounded text-slate-300 hover:text-red-400 transition-colors shrink-0 mt-1"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Comment input - 로그인한 사용자만 */}
            {user && profile ? (
              <div className="flex gap-2.5">
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.nickname}
                    className="w-7 h-7 rounded-full object-cover shrink-0 mt-1.5"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-semibold shrink-0 mt-1.5">
                    {profile.nickname.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="flex-1">
                  <textarea
                    value={commentInput}
                    onChange={(e) => setCommentInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                        e.preventDefault();
                        handleAddComment();
                      }
                    }}
                    placeholder="댓글을 입력하세요... (Cmd+Enter로 제출)"
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-300 outline-none focus:border-indigo-400 resize-none transition-colors placeholder-slate-400"
                  />
                  <div className="flex justify-end mt-1.5">
                    <button
                      onClick={handleAddComment}
                      disabled={!commentInput.trim()}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
                    >
                      댓글 추가
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-2">
                댓글을 작성하려면 로그인이 필요합니다.
              </p>
            )}
          </div>}
        </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-700 shrink-0 bg-slate-50 dark:bg-slate-900">
          <div>
            {isEdit && !deleteConfirm && (
              <button
                onClick={() => setDeleteConfirm(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors border border-red-200 dark:border-red-800"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
                카드 삭제
              </button>
            )}
            {isEdit && deleteConfirm && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-red-600 dark:text-red-400 font-medium">
                  삭제하면 되돌릴 수 없습니다.
                </span>
                <button
                  onClick={() => onDelete(card!.id)}
                  className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-red-600 hover:bg-red-700 text-white transition-colors"
                >
                  삭제 확인
                </button>
                <button
                  onClick={() => setDeleteConfirm(false)}
                  className="px-3 py-1.5 rounded-lg text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  취소
                </button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              취소
            </button>
            <button
              onClick={handleSave}
              disabled={!title.trim()}
              className="px-5 py-2 rounded-lg text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors shadow-sm"
            >
              {isEdit ? "저장" : "카드 추가"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
