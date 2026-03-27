import { notFound } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { getProject, getProjects, getAllMembers } from "@/lib/supabase/queries";
import BoardPageClient from "./BoardPageClient";

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = await createServerClient();
  const [project, allProjects, allMembers] = await Promise.all([
    getProject(client, id),
    getProjects(client),
    getAllMembers(client),
  ]);

  if (!project) notFound();

  return <BoardPageClient project={project} allProjects={allProjects} allMembers={allMembers} />;
}
