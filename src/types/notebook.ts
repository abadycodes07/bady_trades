
export interface Folder {
  id: string;
  name: string;
  icon?: React.ElementType; // Lucide icon component
}

export interface Tag {
  id: string;
  name: string;
  color: string; // e.g., 'bg-blue-500'
}

// Basic structure for rich text content block
// This can be expanded based on the rich text editor's capabilities
export interface NoteContentBlock {
  type: 'paragraph' | 'heading1' | 'heading2' | 'bulletList' | 'orderedList' | 'checkList' | 'image' | 'codeBlock';
  children: { text: string; bold?: boolean; italic?: boolean; underline?: boolean; code?: boolean; color?: string; highlight?: string; link?: string }[];
  url?: string; // For images or links
  checked?: boolean; // For checklists
}


export interface Note {
  id: string;
  title: string;
  content: NoteContentBlock[]; // Updated to support rich text
  createdAt: Date;
  updatedAt: Date;
  folderId?: string;
  tagIds?: string[];
  linkedTradeId?: string | number; // ID of the linked trade from CsvTradeData
}
