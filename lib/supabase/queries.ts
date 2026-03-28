import { SupabaseClient } from "@supabase/supabase-js";
import { Project, Member, Tag, Column, Card, Comment, Profile } from "@/lib/types";

// ─── Raw Supabase response types ────────────────────────────────────────────

export type RawMember = { id: string; name: string; avatar: string; color: string; user_id?: string | null };

export type RawProfile = { id: string; nickname: string; avatar_url: string | null };

export type RawCard = {
  id: string;
  column_id: string;
  title: string;
  description: string;
  body: string;
  due_date: string | null;
  position: number;
  created_at: string;
  assignee: RawMember | null;
  card_stakeholders: { members: RawMember | null }[];
  card_tags: { tags: { id: string; title: string; color: string } }[];
  comments?: { id: string; content: string; created_at: string; author: RawProfile | null }[];
  attachments?: { id: string; name: string; size: number; url: string | null; created_at: string }[];
};

export type RawColumn = {
  id: string;
  title: string;
  position: number;
  color: string | null;
  status: string | null;
  cards: RawCard[];
};

export type RawProject = {
  id: string;
  title: string;
  description: string;
  project_stars: { user_id: string }[];
  is_ended: boolean;
  status: string;
  created_at: string;
  owner_id: string | null;
  project_members: { members: RawMember }[];
  columns: RawColumn[];
};

// ─── Mappers ─────────────────────────────────────────────────────────────────

export function mapCard(raw: RawCard): Card {
  return {
    id: raw.id,
    column_id: raw.column_id,
    title: raw.title,
    description: raw.description,
    body: raw.body,
    due_date: raw.due_date,
    position: raw.position,
    created_at: raw.created_at,
    assignee: raw.assignee ?? null,
    stakeholders: raw.card_stakeholders.flatMap((cs) => cs.members ? [cs.members] : []),
    tags: raw.card_tags.map((ct) => ct.tags),
    comments: (raw.comments ?? [])
      .filter((c) => c.author !== null)
      .map((c) => ({
        id: c.id,
        content: c.content,
        created_at: c.created_at,
        author: c.author as Profile,
      })),
    attachments: (raw.attachments ?? []).map((a) => ({
      id: a.id,
      name: a.name,
      size: a.size,
      url: a.url ?? "",
      created_at: a.created_at,
    })),
  };
}

export function mapProject(raw: RawProject, userId?: string): Project {
  return {
    id: raw.id,
    title: raw.title,
    description: raw.description,
    is_starred: userId ? raw.project_stars.some((s) => s.user_id === userId) : false,
    is_ended: raw.is_ended,
    status: (raw.status as Project["status"]) ?? "대기",
    created_at: raw.created_at,
    owner_id: raw.owner_id ?? null,
    members: raw.project_members.map((pm) => pm.members),
    columns: raw.columns.map((col) => ({
      id: col.id,
      title: col.title,
      position: col.position,
      color: col.color ?? undefined,
      status: (col.status as Column["status"]) ?? undefined,
    })),
    cards: raw.columns.flatMap((col) => col.cards.map(mapCard)),
  };
}

const PROJECT_SELECT = `
  id, title, description, is_ended, status, created_at, owner_id,
  project_stars ( user_id ),
  project_members ( members ( id, name, avatar, color, user_id ) ),
  columns (
    id, title, position, color, status,
    cards (
      id, column_id, title, description, body, due_date, position, created_at,
      assignee:members!cards_assignee_id_fkey ( id, name, avatar, color, user_id ),
      card_stakeholders ( members!card_stakeholders_member_id_fkey ( id, name, avatar, color, user_id ) ),
      card_tags ( tags ( id, title, color ) )
    )
  )
`.trim();

const CARD_DETAIL_SELECT = `
  comments ( id, content, created_at, author:profiles ( id, nickname, avatar_url ) ),
  attachments ( id, name, size, url, created_at )
`.trim();

// ─── Queries ─────────────────────────────────────────────────────────────────

export async function getProjects(client: SupabaseClient, userId?: string): Promise<Project[]> {
  const { data, error } = await client
    .from("projects")
    .select(PROJECT_SELECT)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data as unknown as RawProject[]).map((raw) => mapProject(raw, userId));
}

export async function getProject(
  client: SupabaseClient,
  id: string,
  userId?: string
): Promise<Project | null> {
  const { data, error } = await client
    .from("projects")
    .select(PROJECT_SELECT)
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // not found
    throw error;
  }
  return mapProject(data as unknown as RawProject, userId);
}

export async function getCardDetail(
  client: SupabaseClient,
  cardId: string
): Promise<{ comments: Card["comments"]; attachments: Card["attachments"] }> {
  const { data, error } = await client
    .from("cards")
    .select(CARD_DETAIL_SELECT)
    .eq("id", cardId)
    .single();

  if (error) throw error;

  const raw = data as unknown as {
    comments: { id: string; content: string; created_at: string; author: RawProfile | null }[];
    attachments: { id: string; name: string; size: number; url: string | null; created_at: string }[];
  };

  return {
    comments: raw.comments
      .filter((c) => c.author !== null)
      .map((c) => ({
        id: c.id,
        content: c.content,
        created_at: c.created_at,
        author: c.author as Profile,
      })),
    attachments: raw.attachments.map((a) => ({
      id: a.id,
      name: a.name,
      size: a.size,
      url: a.url ?? "",
      created_at: a.created_at,
    })),
  };
}

export async function getProfile(
  client: SupabaseClient,
  userId: string
): Promise<Profile | null> {
  const { data, error } = await client
    .from("profiles")
    .select("id, nickname, avatar_url")
    .eq("id", userId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data as Profile;
}

export async function updateProfile(
  client: SupabaseClient,
  userId: string,
  updates: { nickname?: string; avatar_url?: string | null }
): Promise<void> {
  const { error } = await client
    .from("profiles")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", userId);
  if (error) throw error;
}

// ─── Mutations ───────────────────────────────────────────────────────────────

const DEFAULT_COLUMNS = [
  { title: "대기",  position: 1000, color: "#94a3b8", status: null },
  { title: "진행중", position: 2000, color: "#3b82f6", status: null },
  { title: "완료",  position: 3000, color: "#10b981", status: "done" },
];

export async function createProject(
  client: SupabaseClient,
  data: { title: string; description: string; owner_id?: string }
): Promise<Project> {
  const { data: inserted, error } = await client
    .from("projects")
    .insert({
      title: data.title,
      description: data.description,
      owner_id: data.owner_id ?? null,
    })
    .select("id")
    .single();

  if (error) throw error;
  const projectId = (inserted as { id: string }).id;

  const { error: colError } = await client
    .from("columns")
    .insert(DEFAULT_COLUMNS.map((col) => ({ ...col, project_id: projectId })));

  if (colError) throw colError;

  const { data: full, error: fetchError } = await client
    .from("projects")
    .select(PROJECT_SELECT)
    .eq("id", projectId)
    .single();

  if (fetchError) throw fetchError;
  return mapProject(full as unknown as RawProject);
}

export async function getAllMembers(client: SupabaseClient): Promise<Member[]> {
  const { data, error } = await client
    .from("members")
    .select("id, name, avatar, color, user_id")
    .order("name", { ascending: true });

  if (error) throw error;
  return data as Member[];
}

export async function createMember(
  client: SupabaseClient,
  memberData: { name: string; avatar: string; color: string }
): Promise<Member> {
  const { data, error } = await client
    .from("members")
    .insert(memberData)
    .select("id, name, avatar, color")
    .single();

  if (error) throw error;
  return data as Member;
}

export async function updateMemberAvatarForUser(
  client: SupabaseClient,
  userId: string,
  avatar: string
): Promise<void> {
  const { error } = await client
    .from("members")
    .update({ avatar })
    .eq("user_id", userId);
  if (error) throw error;
}

export async function linkMemberToProject(
  client: SupabaseClient,
  projectId: string,
  memberId: string
): Promise<void> {
  const { error } = await client
    .from("project_members")
    .insert({ project_id: projectId, member_id: memberId });

  if (error) throw error;
}

export async function unlinkMemberFromProject(
  client: SupabaseClient,
  projectId: string,
  memberId: string
): Promise<void> {
  const { error } = await client
    .from("project_members")
    .delete()
    .eq("project_id", projectId)
    .eq("member_id", memberId);
  if (error) throw error;
}

export async function removeMemberFromProjectCards(
  client: SupabaseClient,
  projectId: string,
  memberId: string
): Promise<void> {
  const { data: cols, error: colsError } = await client
    .from("columns")
    .select("id")
    .eq("project_id", projectId);
  if (colsError) throw colsError;

  const columnIds = (cols as { id: string }[]).map((c) => c.id);
  if (columnIds.length === 0) return;

  const { data: cardData, error: cardsError } = await client
    .from("cards")
    .select("id")
    .in("column_id", columnIds);
  if (cardsError) throw cardsError;

  const cardIds = (cardData as { id: string }[]).map((c) => c.id);

  // assignee 해제
  await client
    .from("cards")
    .update({ assignee_id: null })
    .in("column_id", columnIds)
    .eq("assignee_id", memberId);

  // stakeholder 제거
  if (cardIds.length > 0) {
    await client
      .from("card_stakeholders")
      .delete()
      .in("card_id", cardIds)
      .eq("member_id", memberId);
  }
}

export async function deleteProject(
  client: SupabaseClient,
  id: string
): Promise<void> {
  const { error } = await client.from("projects").delete().eq("id", id);
  if (error) throw error;
}

export async function updateProjectStatus(
  client: SupabaseClient,
  id: string,
  status: Project["status"]
): Promise<void> {
  const { error } = await client
    .from("projects")
    .update({ status, is_ended: status === "종료" })
    .eq("id", id);
  if (error) throw error;
}

export async function toggleProjectStar(
  client: SupabaseClient,
  projectId: string,
  userId: string,
  is_starred: boolean
): Promise<void> {
  if (is_starred) {
    const { error } = await client
      .from("project_stars")
      .insert({ user_id: userId, project_id: projectId });
    if (error) throw error;
  } else {
    const { error } = await client
      .from("project_stars")
      .delete()
      .eq("user_id", userId)
      .eq("project_id", projectId);
    if (error) throw error;
  }
}

export async function createColumn(
  client: SupabaseClient,
  data: { title: string; position: number; color: string; project_id: string }
): Promise<Column> {
  const { data: inserted, error } = await client
    .from("columns")
    .insert(data)
    .select("id, title, position, color, status")
    .single();

  if (error) throw error;
  const col = inserted as { id: string; title: string; position: number; color: string | null; status: string | null };
  return {
    id: col.id,
    title: col.title,
    position: col.position,
    color: col.color ?? undefined,
    status: (col.status as Column["status"]) ?? undefined,
  };
}

export async function updateColumn(
  client: SupabaseClient,
  columnId: string,
  updates: Partial<{ title: string; position: number; color: string; status: string | null }>
): Promise<void> {
  const { error } = await client.from("columns").update(updates).eq("id", columnId);
  if (error) throw error;
}

export async function deleteColumn(
  client: SupabaseClient,
  columnId: string
): Promise<void> {
  const { error } = await client.from("columns").delete().eq("id", columnId);
  if (error) throw error;
}

export async function upsertTag(client: SupabaseClient, tag: Tag, projectId: string): Promise<void> {
  const { error } = await client
    .from("tags")
    .upsert({ id: tag.id, title: tag.title, color: tag.color, project_id: projectId });
  if (error) throw error;
}

export async function upsertCard(client: SupabaseClient, card: Card): Promise<void> {
  const { error: cardError } = await client.from("cards").upsert({
    id: card.id,
    column_id: card.column_id,
    title: card.title,
    description: card.description,
    body: card.body,
    due_date: card.due_date,
    position: card.position,
    assignee_id: card.assignee?.id ?? null,
  });
  if (cardError) throw cardError;

  const { error: delTagsError } = await client
    .from("card_tags")
    .delete()
    .eq("card_id", card.id);
  if (delTagsError) throw delTagsError;

  if (card.tags.length > 0) {
    const { error: tagsError } = await client
      .from("card_tags")
      .insert(card.tags.map((t) => ({ card_id: card.id, tag_id: t.id })));
    if (tagsError) throw tagsError;
  }

  const { error: delStakeholdersError } = await client
    .from("card_stakeholders")
    .delete()
    .eq("card_id", card.id);
  if (delStakeholdersError) throw delStakeholdersError;

  if (card.stakeholders.length > 0) {
    const { error: stakeholdersError } = await client
      .from("card_stakeholders")
      .insert(card.stakeholders.map((m) => ({ card_id: card.id, member_id: m.id })));
    if (stakeholdersError) throw stakeholdersError;
  }
}

export async function deleteCard(client: SupabaseClient, cardId: string): Promise<void> {
  const { error } = await client.from("cards").delete().eq("id", cardId);
  if (error) throw error;
}

export async function createComment(
  client: SupabaseClient,
  cardId: string,
  authorId: string,
  content: string
): Promise<Comment> {
  const { data, error } = await client
    .from("comments")
    .insert({ card_id: cardId, author_id: authorId, content })
    .select("id, content, created_at, author:profiles ( id, nickname, avatar_url )")
    .single();

  if (error) throw error;
  const raw = data as unknown as { id: string; content: string; created_at: string; author: RawProfile };
  return {
    id: raw.id,
    content: raw.content,
    created_at: raw.created_at,
    author: raw.author,
  };
}

export async function deleteComment(
  client: SupabaseClient,
  commentId: string
): Promise<void> {
  const { error } = await client.from("comments").delete().eq("id", commentId);
  if (error) throw error;
}

export async function addAttachment(
  client: SupabaseClient,
  cardId: string,
  name: string,
  size: number,
  url: string
): Promise<{ id: string; name: string; size: number; url: string; created_at: string }> {
  const { data, error } = await client
    .from("attachments")
    .insert({ card_id: cardId, name, size, url })
    .select("id, name, size, url, created_at")
    .single();
  if (error) throw error;
  return data as { id: string; name: string; size: number; url: string; created_at: string };
}

export async function deleteAttachment(
  client: SupabaseClient,
  attachmentId: string
): Promise<void> {
  const { error } = await client.from("attachments").delete().eq("id", attachmentId);
  if (error) throw error;
}

const MEMBER_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#3b82f6",
];

export async function upsertMemberForUser(
  client: SupabaseClient,
  userId: string,
  profile: { nickname: string; avatar_url: string | null }
): Promise<Member> {
  const avatar = profile.avatar_url ?? profile.nickname.slice(0, 2).toUpperCase();
  const color = MEMBER_COLORS[userId.charCodeAt(0) % MEMBER_COLORS.length];

  const { data, error } = await client
    .from("members")
    .upsert(
      { user_id: userId, name: profile.nickname, avatar, color },
      { onConflict: "user_id" }
    )
    .select("id, name, avatar, color, user_id")
    .single();

  if (error) throw error;
  return data as Member;
}
