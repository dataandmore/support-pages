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
  onChange: (content: unknown) => void
  /** Optional: called when user uploads an image directly (file picker fallback). */
  onImageUpload?: (file: File) => Promise<string>
  placeholder?: string
}

export function RichEditor({ content, onChange, onImageUpload }: RichEditorProps) {
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    content: content as any,
    editorProps: {
      attributes: {
        class: "prose max-w-none focus:outline-none min-h-[400px] p-6",
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getJSON())
    },
  })

  // Opens the media library picker. Falls back to direct file upload if no picker is available.
  function handleImageButtonClick() {
    if (!editor) return
    // If onImageUpload is provided (direct upload to /api/media), open the media picker
    // which also supports file uploads internally.
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
        <EditorToolbar
          editor={editor}
          onImageUpload={handleImageButtonClick}
        />
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
