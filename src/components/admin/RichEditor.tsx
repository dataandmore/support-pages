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
import { useCallback } from "react"

interface RichEditorProps {
  content?: unknown
  onChange: (content: unknown) => void
  onImageUpload?: (file: File) => Promise<string>
  placeholder?: string
}

export function RichEditor({ content, onChange, onImageUpload }: RichEditorProps) {
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
        class: "prose prose-blue max-w-none focus:outline-none min-h-[400px] p-6",
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getJSON())
    },
  })

  const handleImageUpload = useCallback(() => {
    if (!editor || !onImageUpload) return
    const input = document.createElement("input")
    input.type = "file"
    input.accept = "image/*"
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      const url = await onImageUpload(file)
      editor.chain().focus().setImage({ src: url }).run()
    }
    input.click()
  }, [editor, onImageUpload])

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
      <EditorToolbar
        editor={editor}
        onImageUpload={onImageUpload ? handleImageUpload : undefined}
      />
      <EditorContent editor={editor} />
    </div>
  )
}
