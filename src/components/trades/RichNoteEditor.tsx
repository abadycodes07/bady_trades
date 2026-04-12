'use client';

import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import { cn } from '@/lib/utils';
import { 
  Bold, Italic, List, ListOrdered, Heading1, Heading2, Heading3, 
  Quote, Image as LucideImage, Link as LucideLink, Undo, Redo,
  CheckSquare
} from 'lucide-react';

interface RichNoteEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
}

const MenuButton = ({ 
  onClick, 
  isActive = false, 
  children,
  title
}: { 
  onClick: () => void; 
  isActive?: boolean; 
  children: React.ReactNode;
  title: string;
}) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    className={cn(
      "p-1.5 rounded-md transition-colors",
      isActive 
        ? "bg-indigo-600/20 text-indigo-400" 
        : "text-muted-foreground hover:bg-white/5 hover:text-white"
    )}
  >
    {children}
  </button>
);

export const RichNoteEditor: React.FC<RichNoteEditorProps> = ({
  content,
  onChange,
  placeholder = 'Write your trade analysis here...',
  className,
}) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'rounded-lg border border-border/10 shadow-lg max-w-full my-4',
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-invert max-w-full focus:outline-none min-h-[200px] text-sm leading-relaxed',
          'prose-h1:text-xl prose-h1:font-black prose-h1:uppercase prose-h1:tracking-tighter',
          'prose-h2:text-lg prose-h2:font-bold prose-h2:tracking-tight',
          'prose-h3:text-md prose-h3:font-bold',
          'prose-p:text-white/70 prose-p:my-2',
          'prose-blockquote:border-l-indigo-500 prose-blockquote:bg-indigo-500/5 prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:rounded-r-md',
          'prose-img:max-h-[400px] prose-img:mx-auto'
        ),
      },
    },
  });

  if (!editor) return null;

  const addImage = () => {
    const url = window.prompt('Enter image URL (In production this would use Supabase Storage Upload)');
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  return (
    <div className={cn("flex flex-col border border-border/10 rounded-xl overflow-hidden bg-white/[0.02]", className)}>
      <div className="flex items-center flex-wrap gap-1 p-2 border-b border-border/5 bg-white/[0.01]">
        <MenuButton 
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive('bold')}
          title="Bold"
        >
          <Bold className="h-4 w-4" />
        </MenuButton>
        <MenuButton 
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive('italic')}
          title="Italic"
        >
          <Italic className="h-4 w-4" />
        </MenuButton>
        <div className="w-[1px] h-4 bg-white/10 mx-1" />
        <MenuButton 
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          isActive={editor.isActive('heading', { level: 1 })}
          title="H1"
        >
          <Heading1 className="h-4 w-4" />
        </MenuButton>
        <MenuButton 
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          isActive={editor.isActive('heading', { level: 2 })}
          title="H2"
        >
          <Heading2 className="h-4 w-4" />
        </MenuButton>
        <div className="w-[1px] h-4 bg-white/10 mx-1" />
        <MenuButton 
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive('bulletList')}
          title="Bullet List"
        >
          <List className="h-4 w-4" />
        </MenuButton>
        <MenuButton 
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive('orderedList')}
          title="Ordered List"
        >
          <ListOrdered className="h-4 w-4" />
        </MenuButton>
        <div className="w-[1px] h-4 bg-white/10 mx-1" />
        <MenuButton 
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor.isActive('blockquote')}
          title="Quote"
        >
          <Quote className="h-4 w-4" />
        </MenuButton>
        <MenuButton 
          onClick={addImage}
          title="Add Image"
        >
          <LucideImage className="h-4 w-4" />
        </MenuButton>
        <div className="flex-1" />
        <MenuButton 
          onClick={() => editor.chain().focus().undo().run()}
          title="Undo"
        >
          <Undo className="h-4 w-4" />
        </MenuButton>
        <MenuButton 
          onClick={() => editor.chain().focus().redo().run()}
          title="Redo"
        >
          <Redo className="h-4 w-4" />
        </MenuButton>
      </div>
      <div className="p-4 bg-transparent cursor-text" onClick={() => editor.chain().focus()}>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
};
