"use client";

import { memo } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card } from "@/lib/types";
import TagBadge from "./TagBadge";
import MemberAvatars from "@/components/landing/MemberAvatars";

interface Props {
  card: Card;
  onClick: (card: Card) => void;
  isDragging?: boolean;
}

export function isOverdue(dueDate: string | null): boolean {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date(new Date().toDateString());
}

const TAG_DISPLAY_LIMIT = 2;

function KanbanCard({ card, onClick, isDragging = false }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging: isSortableDragging } =
    useSortable({ id: card.id, data: { type: "card", card } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.4 : 1,
  };

  const overdue = isOverdue(card.due_date);
  const allMembers = [
    ...(card.assignee ? [card.assignee] : []),
    ...card.stakeholders,
  ];

  const visibleTags = card.tags.slice(0, TAG_DISPLAY_LIMIT);
  const extraTagCount = card.tags.length - TAG_DISPLAY_LIMIT;

  const commentCount = card.comments?.length ?? 0;
  const attachmentCount = card.attachments?.length ?? 0;
  const hasActivity = commentCount > 0 || attachmentCount > 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onClick(card)}
      className={`
        group bg-white dark:bg-slate-800 rounded-xl border
        ${isDragging
          ? "border-indigo-400 shadow-xl rotate-2"
          : "border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-md"
        }
        p-3.5 cursor-pointer transition-all duration-150 select-none
      `}
    >
      {/* Tags */}
      {card.tags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1 mb-2.5">
          {visibleTags.map((tag) => (
            <TagBadge key={tag.id} tag={tag} />
          ))}
          {extraTagCount > 0 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
              +{extraTagCount}
            </span>
          )}
        </div>
      )}

      {/* Title */}
      <p className="text-base font-semibold text-slate-800 dark:text-slate-100 leading-snug mb-3">
        {card.title}
      </p>

      {/* Description */}
      {card.description && (
        <p className="text-xs text-slate-400 dark:text-slate-500 mb-3 line-clamp-2 leading-relaxed">
          {card.description}
        </p>
      )}

      {/* Due date */}
      {card.due_date && (
        <div
          className={`flex items-center gap-1 text-xs font-medium mb-3 ${
            overdue
              ? "text-red-500 dark:text-red-400"
              : "text-slate-400 dark:text-slate-500"
          }`}
        >
          {overdue && (
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
          )}
          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5" />
          </svg>
          <span>{overdue ? `지연 · ${card.due_date}` : card.due_date}</span>
        </div>
      )}

      {/* Footer: avatars (left) + activity counts (right) */}
      <div className="flex items-center justify-between mt-4">
        {/* Member avatars */}
        {allMembers.length > 0 ? (
          <MemberAvatars members={allMembers} max={4} size="xs" />
        ) : (
          <span />
        )}

        {/* Comment + Attachment counts */}
        {hasActivity && (
          <div className="flex items-center gap-2.5">
            {commentCount > 0 && (
              <div className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                </svg>
                <span>{commentCount}</span>
              </div>
            )}
            {attachmentCount > 0 && (
              <div className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
                </svg>
                <span>{attachmentCount}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(KanbanCard);
