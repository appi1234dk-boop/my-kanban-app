import { Tag } from "@/lib/types";

interface Props {
  tag: Tag;
  size?: "sm" | "md";
  selected?: boolean;
}

function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

export default function TagBadge({ tag, size = "sm", selected = false }: Props) {
  const rgb = hexToRgb(tag.color);
  const bg = rgb
    ? `rgba(${rgb.r},${rgb.g},${rgb.b},${selected ? 0.25 : 0.12})`
    : "#e5e7eb";
  const text = tag.color;

  return (
    <span
      className={`inline-flex items-center rounded-full ${
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs"
      } ${selected ? "font-bold" : "font-medium"}`}
      style={{ backgroundColor: bg, color: text }}
    >
      {tag.title}
    </span>
  );
}
