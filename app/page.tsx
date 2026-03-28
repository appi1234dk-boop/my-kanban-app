import { createServerClient } from "@/lib/supabase/server";
import { getProjects } from "@/lib/supabase/queries";
import ProjectsClient from "@/components/landing/ProjectsClient";

export default async function Home() {
  const client = await createServerClient();
  const projects = await getProjects(client);

  return <ProjectsClient initialProjects={projects} />;
}
