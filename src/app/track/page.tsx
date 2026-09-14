import { redirect } from "next/navigation";

export default async function TrackPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const id = params?.id ? `?id=${params.id}` : "";
  redirect(`/requests${id}`);
}
