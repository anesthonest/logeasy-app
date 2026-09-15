export interface Folder {
  id: string;
  name: string;
  icon?: string;
  createdAt: string;
  color?: string;
}

export interface Tag {
  name: string;
  count: number;
}

export interface SearchFilter {
  query: string;
  tags: string[];
  categories: string[];
  language?: string;
  durationMin?: number;
  durationMax?: number;
  isPinned?: boolean;
  isFavorite?: boolean;
  isArchived?: boolean;
  isTrash?: boolean;
  sortBy: 'createdAt_desc' | 'createdAt_asc' | 'audioDuration_desc' | 'title_asc';
}

export interface SavedSearch {
  id: string;
  name: string;
  filter: SearchFilter;
  createdAt: string;
}
