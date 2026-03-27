"use client";

import { Member } from "@/lib/types";

interface Props {
  member: Member;
  size?: "xs" | "sm" | "md";
  className?: string;
}

const SIZE_CLASS = {
  xs: "w-5 h-5 text-[10px]",
  sm: "w-7 h-7 text-xs",
  md: "w-8 h-8 text-sm",
};

function isUrl(value: string) {
  return value.startsWith("http://") || value.startsWith("https://");
}

export default function MemberAvatar({ member, size = "sm", className = "" }: Props) {
  const sizeClass = SIZE_CLASS[size];

  return (
    <div
      className={`${sizeClass} rounded-full overflow-hidden flex items-center justify-center shrink-0 font-semibold text-white ${className}`}
      style={isUrl(member.avatar) ? {} : { backgroundColor: member.color }}
      title={member.name}
    >
      {isUrl(member.avatar) ? (
        <img src={member.avatar} alt={member.name} className="w-full h-full object-cover" />
      ) : (
        member.avatar
      )}
    </div>
  );
}
