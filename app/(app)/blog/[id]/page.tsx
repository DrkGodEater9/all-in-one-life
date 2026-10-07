import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BlogDetailClient } from "@/components/modules/blog/BlogDetailClient";

export const metadata: Metadata = { title: "Entrada" };

export default function BlogPostPage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) notFound();

  return <BlogDetailClient postId={id} />;
}
