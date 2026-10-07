import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { BlogClient } from "@/components/modules/blog/BlogClient";

export const metadata: Metadata = { title: "Blog" };

export default function BlogPage() {
  return (
    <>
      <PageHeader
        title="Blog"
        description="Notas del grupo de investigación y todo lo que valga la pena guardar."
      />
      <BlogClient />
    </>
  );
}
