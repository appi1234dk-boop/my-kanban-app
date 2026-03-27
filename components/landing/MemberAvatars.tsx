"use client";

import { Member } from "@/lib/types";
import MemberAvatar from "@/components/ui/MemberAvatar";

interface Props {
  members: Member[];
  max?: number;
  size?: "xs" | "sm" | "md";
}

export default function MemberAvatars({ members, max = 3, size = "sm" }: Props) {
  const visible = members.slice(0, max);
  const rest = members.length - max;
  const sizeClass = size === "xs" ? "w-5 h-5 text-[10px]" : size === "sm" ? "w-7 h-7 text-xs" : "w-8 h-8 text-sm";

  return (
    <div className="flex -space-x-2">
      {visible.map((member) => (
        <MemberAvatar
          key={member.id}
          member={member}
          size={size}
          className="border-2 border-white dark:border-gray-800"
        />
      ))}
      {rest > 0 && (
        <div
          className={`${sizeClass} rounded-full border-2 border-white dark:border-gray-800 flex items-center justify-center font-semibold bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 shrink-0`}
        >
          +{rest}
        </div>
      )}
    </div>
  );
}
