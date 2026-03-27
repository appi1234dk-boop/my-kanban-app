"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  TouchSensor,
  closestCorners,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { SortableContext, horizontalListSortingStrategy } from "@dnd-kit/sortable";
import { Card, Column, Project, Tag } from "@/lib/types";
import { supabase } from "@/lib/supabase/client";
import { upsertCard, deleteCard, upsertTag, createColumn, updateColumn, deleteColumn, addAttachment } from "@/lib/supabase/queries";
import { reorderColumns, reorderCardsInColumn } from "@/lib/board-logic";
import KanbanColumn from "./KanbanColumn";
import KanbanCard from "./KanbanCard";
import CardModal from "./CardModal";

interface Props {
  project: Project;
  initialTags?: Tag[];
  onProgressChange?: (doneCards: number, excludedCards: number, totalCards: number) => void;
  removedMemberIds?: string[];
  filterMemberIds?: string[];
}

export default function KanbanBoard({ project: initialProject, initialTags = [], onProgressChange, removedMemberIds, filterMemberIds }: Props) {
  const [columns, setColumns] = useState<Column[]>(initialProject.columns);
  const [cards, setCards] = useState<Card[]>(
    [...initialProject.cards].sort((a, b) => b.position - a.position)
  );
  const [globalTags, setGlobalTags] = useState<Tag[]>(initialTags);
  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const [_activeColumnId, setActiveColumnId] = useState<string | null>(null);
  const dragStartColumnIdRef = useRef<string | null>(null);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalCard, setModalCard] = useState<Card | null>(null);
  const [modalColumnId, setModalColumnId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  const sortedColumns = useMemo(
    () => [...columns].sort((a, b) => a.position - b.position),
    [columns]
  );

  const cardsByColumn = useMemo(() => {
    const map = new Map<string, typeof cards>();
    for (const card of cards) {
      const col = map.get(card.column_id) ?? [];
      col.push(card);
      map.set(card.column_id, col);
    }
    // apply member filter and sort per column
    for (const [colId, colCards] of map) {
      map.set(
        colId,
        colCards
          .filter((c) => {
            if (!filterMemberIds || filterMemberIds.length === 0) return true;
            return (
              (c.assignee && filterMemberIds.includes(c.assignee.id)) ||
              c.stakeholders.some((s) => filterMemberIds.includes(s.id))
            );
          })
          .sort((a, b) => b.position - a.position)
      );
    }
    return map;
  }, [cards, filterMemberIds]);

  function getColumnCards(columnId: string) {
    return cardsByColumn.get(columnId) ?? [];
  }

  // ── Drag handlers ──────────────────────────────────────────────
  function handleDragStart(event: DragStartEvent) {
    const { active } = event;
    if (active.data.current?.type === "card") {
      setActiveCard(active.data.current.card);
      dragStartColumnIdRef.current = active.data.current.card.column_id;
    } else if (active.data.current?.type === "column") {
      setActiveColumnId(active.data.current.column.id);
    }
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;
    if (active.data.current?.type !== "card") return;

    const activeId = String(active.id);

    const activeCard = cards.find((c) => c.id === activeId);
    if (!activeCard) return;

    let targetColumnId: string | null = null;
    if (over.data.current?.type === "column") {
      targetColumnId = over.data.current.column.id;
    } else if (over.data.current?.type === "card") {
      targetColumnId = over.data.current.card.column_id;
    }

    if (targetColumnId && activeCard.column_id !== targetColumnId) {
      setCards((prev) =>
        prev.map((c) =>
          c.id === activeId ? { ...c, column_id: targetColumnId! } : c
        )
      );
      setActiveCard((prev) =>
        prev ? { ...prev, column_id: targetColumnId! } : prev
      );
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    const currentActiveCard = activeCard;
    const originalColumnId = dragStartColumnIdRef.current;
    dragStartColumnIdRef.current = null;
    setActiveCard(null);
    setActiveColumnId(null);
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    // Column reorder
    if (active.data.current?.type === "column") {
      const activeColId = activeId.replace("col-", "");
      const overColId = overId.replace("col-", "");
      const result = reorderColumns(sortedColumns, activeColId, overColId);
      if (result !== sortedColumns) {
        setColumns(result);
        await Promise.all(
          result.map((col) => updateColumn(supabase, col.id, { position: col.position }))
        );
      }
      return;
    }

    // Card reorder within same column
    if (active.data.current?.type === "card" && over.data.current?.type === "card") {
      setCards((prev) => reorderCardsInColumn(prev, activeId, overId));
    }

    // Cross-column move: persist to DB
    if (
      active.data.current?.type === "card" &&
      currentActiveCard &&
      originalColumnId &&
      currentActiveCard.column_id !== originalColumnId
    ) {
      await upsertCard(supabase, currentActiveCard);
    }
  }

  // ── Column CRUD ────────────────────────────────────────────────
  async function handleAddColumn() {
    const position = (sortedColumns.at(-1)?.position ?? 0) + 1000;
    const tempId = `temp-${Date.now()}`;
    const optimisticCol: Column = { id: tempId, title: "새 컬럼", position, color: "#94a3b8" };
    setColumns((prev) => [...prev, optimisticCol]);
    try {
      const saved = await createColumn(supabase, {
        title: "새 컬럼",
        position,
        color: "#94a3b8",
        project_id: initialProject.id,
      });
      setColumns((prev) => prev.map((c) => (c.id === tempId ? saved : c)));
    } catch {
      setColumns((prev) => prev.filter((c) => c.id !== tempId));
    }
  }

  async function handleDeleteColumn(columnId: string) {
    setColumns((prev) => prev.filter((c) => c.id !== columnId));
    setCards((prev) => prev.filter((c) => c.column_id !== columnId));
    await deleteColumn(supabase, columnId);
  }

  async function handleRenameColumn(columnId: string, title: string) {
    setColumns((prev) => prev.map((c) => (c.id === columnId ? { ...c, title } : c)));
    await updateColumn(supabase, columnId, { title });
  }

  async function handleColorChange(columnId: string, color: string) {
    setColumns((prev) => prev.map((c) => (c.id === columnId ? { ...c, color } : c)));
    await updateColumn(supabase, columnId, { color });
  }

  async function handleStatusChange(columnId: string, status: "none" | "done" | "stopped") {
    setColumns((prev) => prev.map((c) => (c.id === columnId ? { ...c, status } : c)));
    await updateColumn(supabase, columnId, { status: status === "none" ? null : status });
  }

  // 멤버 제거 시 카드 state 정리
  useEffect(() => {
    if (!removedMemberIds?.length) return;
    setCards((prev) =>
      prev.map((card) => ({
        ...card,
        assignee: removedMemberIds.includes(card.assignee?.id ?? "") ? null : card.assignee,
        stakeholders: card.stakeholders.filter((s) => !removedMemberIds.includes(s.id)),
      }))
    );
  }, [removedMemberIds]);

  // Progress 콜백: columns 또는 cards 변경시마다 계산
  useEffect(() => {
    if (!onProgressChange) return;
    const doneColIds = new Set(columns.filter((c) => c.status === "done").map((c) => c.id));
    const stoppedColIds = new Set(columns.filter((c) => c.status === "stopped").map((c) => c.id));
    const doneCards = cards.filter((c) => doneColIds.has(c.column_id)).length;
    const excludedCards = cards.filter((c) => stoppedColIds.has(c.column_id)).length;
    onProgressChange(doneCards, excludedCards, cards.length);
  }, [columns, cards, onProgressChange]);

  // ── Card CRUD ──────────────────────────────────────────────────
  function handleOpenAddCard(columnId: string) {
    setModalCard(null);
    setModalColumnId(columnId);
    setModalOpen(true);
  }

  function handleCardClick(card: Card) {
    setModalCard(card);
    setModalColumnId(card.column_id);
    setModalOpen(true);
  }

  async function handleSaveCard(card: Card, pendingFiles?: File[]) {
    setCards((prev) => {
      const exists = prev.find((c) => c.id === card.id);
      if (exists) return prev.map((c) => (c.id === card.id ? card : c));
      return [card, ...prev];
    });
    setModalOpen(false);
    await upsertCard(supabase, card);

    if (pendingFiles && pendingFiles.length > 0) {
      const uploaded: typeof card.attachments = [];
      for (const file of pendingFiles) {
        const tempId = `${Date.now()}-${Math.random()}`;
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
          uploaded.push({ ...saved, url: saved.url ?? "" });
        } catch {
          // 개별 파일 업로드 실패 시 무시
        }
      }
      if (uploaded.length > 0) {
        setCards((prev) =>
          prev.map((c) => c.id === card.id
            ? { ...c, attachments: [...c.attachments.filter((a) => !a.id.startsWith("pending-")), ...uploaded] }
            : c
          )
        );
      }
    }
  }

  async function handleDeleteCard(cardId: string) {
    setCards((prev) => prev.filter((c) => c.id !== cardId));
    setModalOpen(false);
    await deleteCard(supabase, cardId);
  }

  async function handleSaveTag(tag: Tag) {
    setGlobalTags((prev) => {
      const exists = prev.find((t) => t.id === tag.id);
      if (exists) return prev.map((t) => (t.id === tag.id ? tag : t));
      return [...prev, tag];
    });
    await upsertTag(supabase, tag, initialProject.id);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Board */}
      <div className="flex-1 overflow-x-auto px-6 py-4 pb-6">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={sortedColumns.map((c) => `col-${c.id}`)}
            strategy={horizontalListSortingStrategy}
          >
            <div className="flex gap-4 h-full items-start">
              {sortedColumns.map((column) => (
                <KanbanColumn
                  key={column.id}
                  column={column}
                  cards={getColumnCards(column.id)}
                  onCardClick={handleCardClick}
                  onAddCard={handleOpenAddCard}
                  onDeleteColumn={handleDeleteColumn}
                  onRenameColumn={handleRenameColumn}
                  onColorChange={handleColorChange}
                  onStatusChange={handleStatusChange}
                />
              ))}

              {/* Add New Column ghost button */}
              <div className="w-72 shrink-0">
                <button
                  onClick={handleAddColumn}
                  className="w-full flex flex-col items-center justify-center gap-2 py-6 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 hover:border-indigo-300 dark:hover:border-indigo-600 hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 transition-all group"
                >
                  <div className="w-8 h-8 rounded-full border-2 border-dashed border-current flex items-center justify-center group-hover:scale-110 transition-transform">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                  </div>
                  <span className="text-sm font-medium">Add New Column</span>
                </button>
              </div>
            </div>
          </SortableContext>

          <DragOverlay>
            {activeCard && (
              <KanbanCard card={activeCard} onClick={() => {}} isDragging />
            )}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Card Modal */}
      {modalOpen && (
        <CardModal
          card={modalCard}
          columnId={modalColumnId!}
          columns={sortedColumns}
          allTags={globalTags}
          allMembers={initialProject.members}
          onSave={handleSaveCard}
          onDelete={handleDeleteCard}
          onSaveTag={handleSaveTag}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}
