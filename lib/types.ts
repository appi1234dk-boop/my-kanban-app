export interface Profile {
  id: string;
  nickname: string;
  avatar_url: string | null;
}

export interface Member {
  id: string;
  name: string;
  avatar: string; // 이니셜 or 이미지 URL
  color: string;  // 아바타 배경색 (이니셜용)
  user_id?: string | null;
}

export interface Tag {
  id: string;
  title: string;
  color: string; // hex color
}

export interface Comment {
  id: string;
  author: Profile;    // auth 사용자 프로필
  content: string;
  created_at: string; // ISO 8601
}

export interface Attachment {
  id: string;
  name: string;
  size: number; // bytes
  url: string;
  created_at: string; // ISO 8601
}

export interface Card {
  id: string;
  column_id: string;
  title: string;
  description: string;
  body: string; // Tiptap HTML
  due_date: string | null; // YYYY-MM-DD
  assignee: Member | null;
  stakeholders: Member[];
  tags: Tag[];
  position: number;
  created_at: string;
  comments: Comment[];
  attachments: Attachment[];
}

export interface Column {
  id: string;
  title: string;
  position: number;
  color?: string; // 상태 표시 색상 (hex)
  status?: "none" | "done" | "stopped"; // 진행율 계산용 컬럼 유형
}

export interface Project {
  id: string;
  title: string;
  description: string;
  members: Member[];
  is_starred: boolean;
  is_ended: boolean;
  status: "대기" | "진행중" | "종료";
  columns: Column[];
  cards: Card[];
  created_at: string;
  owner_id: string | null;
}
