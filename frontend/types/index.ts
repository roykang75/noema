/**
 * 프로젝트 전체 공유 타입 정의
 */

export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
}

export interface Workspace {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
}

export interface Page {
  id: string;
  workspace_id: string;
  parent_page_id: string | null;
  title: string;
  icon: string | null;
  is_deleted: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Block {
  id: string;
  page_id: string;
  parent_block_id: string | null;
  type: string;
  content: Record<string, unknown> | null;
  order: number;
  created_at: string;
  updated_at: string;
}

export interface Tag {
  id: string;
  workspace_id: string;
  name: string;
  color: string | null;
}
