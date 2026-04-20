"use client"

import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import TiptapImage from "@tiptap/extension-image"
import { Table, TableRow, TableCell, TableHeader } from "@tiptap/extension-table"
import TiptapLink from "@tiptap/extension-link"
import TiptapUnderline from "@tiptap/extension-underline"
import TiptapTextAlign from "@tiptap/extension-text-align"
import TiptapHighlight from "@tiptap/extension-highlight"
import TiptapYoutube from "@tiptap/extension-youtube"
import { EditorToolbar } from "./EditorToolbar"
import { MediaPicker } from "./MediaPicker"
import { useState } from "react"

interface RichEditorProps {
  content?: unknown
  onChange?: (content: unknown) => void
  /** Render content read-only — no toolbar, no cursor, same prose styles. Used for preview. */
  readOnly?: boolean
  onImageUpload?: (file: File) => Promise<string>
  placeholder?: string
}

export function RichEditor({ content, onChange, onImageUpload, readOnly = false }: RichEditorProps) {
  const [showMediaPicker, setShowMediaPicker] = useState(false)

  const editor = useEditor({
    extensions: [
      StarterKit,
      TiptapImage.configure({ inline: false }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      TiptapLink.configure({ openOnClick: false, autolink: true }),
      TiptapUnderline,
      TiptapTextAlign.configure({ types: ["heading", "paragraph"] }),
      TiptapHighlight,
      TiptapYoutube.configure({ controls: true, nocookie: true }),
    ],
    immediatelyRender: false,
    editable: !readOnly,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    content: content as any,
    editorProps: {
      attributes: {
        // Use article-content so the editor is true WYSIWYG —
        // headings, code blocks, tables look exactly like the published page.
        class: readOnly
          ? "article-content p-0 focus:outline-none"
          : "article-content focus:outline-none min-h-[400px] p-6",
      },
    },
    onUpdate: ({ editor }) => {
      if (!readOnly) onChange?.(editor.getJSON())
    },
  })

  if (readOnly) {
    return <EditorContent editor={editor} />
  }

  function handleImageButtonClick() {
    if (!editor) return
    setShowMediaPicker(true)
  }

  function handleMediaSelect(url: string) {
    if (!editor) return
    editor.chain().focus().setImage({ src: url }).run()
    setShowMediaPicker(false)
  }

  return (
    <>
      <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
        <EditorToolbar editor={editor} onImageUpload={handleImageButtonClick} />
        <EditorContent editor={editor} />
      </div>

      {showMediaPicker && (
        <MediaPicker
          onSelect={handleMediaSelect}
          onClose={() => setShowMediaPicker(false)}
        />
      )}
    </>
  )
}
