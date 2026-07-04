import { redirect } from "next/navigation";

export default async function ContainerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/containers/${id}/files`);
}
