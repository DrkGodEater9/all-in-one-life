/** Formas que devuelve la API del blog (fechas ya serializadas a ISO string). */

export interface BlogLink {
  id: number;
  postId: number;
  title: string | null;
  url: string;
  createdAt: string;
}

export interface BlogPost {
  id: number;
  title: string;
  content: string;
  tags: string[];
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
  links: BlogLink[];
}
