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
import { LinkBubbleMenu } from "./LinkBubbleMenu"
import { MediaPicker } from "./MediaPicker"
import { VideoPicker, type VideoInsertion } from "./VideoPicker"
import { VideoEmbed } from "@/lib/tiptap-video-embed"
import { uploadImage } from "@/lib/upload-image"
import { useCallback, useEffect, useRef, useState } from "react"
import type { Editor } from "@tiptap/react"

interface RichEditorProps {
  content?: unknown
  onChange?: (content: unknown) => void
  /** Render content read-only — no toolbar, no cursor, same prose styles. Used for preview. */
  readOnly?: boolean
  placeholder?: string
}

function insertImageUrl(editor: Editor, url: string) {
  editor.chain().focus().setImage({ src: url }).run()
}

export function RichEditor({ content, onChange, readOnly = false }: RichEditorProps) {
  const [showMediaPicker, setShowMediaPicker] = useState(false)
  const [showVideoPicker, setShowVideoPicker] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const editorRef = useRef<Editor | null>(null)

  const handleImageFile = useCallback(async (file: File) => {
    const editor = editorRef.current
    if (!editor || !file.type.startsWith("image/")) return

    setUploadingImage(true)
    try {
      const url = await uploadImage(file)
      insertImageUrl(editor, url)
    } catch (err) {
      alert(err instanceof Error ? err.message : "Image upload failed")
    } finally {
      setUploadingImage(false)
    }
  }, [])

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
      VideoEmbed,
    ],
    immediatelyRender: false,
    editable: !readOnly,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    content: content as any,
    editorProps: {
      attributes: {
        class: readOnly
          ? "article-content p-0 focus:outline-none"
          : "article-content focus:outline-none min-h-[400px] p-6",
      },
      handlePaste: (_view, event) => {
        const items = event.clipboardData?.items
        if (!items) return false

        for (const item of items) {
          if (item.type.startsWith("image/")) {
            event.preventDefault()
            const file = item.getAsFile()
            if (file) void handleImageFile(file)
            return true
          }
        }
        return false
      },
      handleDrop: (_view, event, _slice, moved) => {
        if (moved) return false
        const file = event.dataTransfer?.files?.[0]
        if (file?.type.startsWith("image/")) {
          event.preventDefault()
          void handleImageFile(file)
          return true
        }
        return false
      },
    },
    onUpdate: ({ editor }) => {
      if (!readOnly) onChange?.(editor.getJSON())
    },
  })

  useEffect(() => {
    editorRef.current = editor
  }, [editor])

  if (readOnly) {
    return <EditorContent editor={editor} />
  }

  function handleMediaSelect(url: string) {
    if (!editor) return
    insertImageUrl(editor, url)
    setShowMediaPicker(false)
  }

  function handleVideoSelect(insertion: VideoInsertion) {
    if (!editor) return
    if (insertion.kind === "youtube") {
      editor.chain().focus().setYoutubeVideo({ src: insertion.src }).run()
    } else {
      editor
        .chain()
        .focus()
        .insertContent({
          type: "videoEmbed",
          attrs: { src: insertion.src, title: insertion.title },
        })
        .run()
    }
    setShowVideoPicker(false)
  }

  return (
    <>
      <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
        <EditorToolbar
          editor={editor}
          onImageUpload={() => setShowMediaPicker(true)}
          onVideoInsert={() => setShowVideoPicker(true)}
          imageUploading={uploadingImage}
        />
        {editor && <LinkBubbleMenu editor={editor} />}
        <EditorContent editor={editor} />
      </div>

      {showMediaPicker && (
        <MediaPicker
          onSelect={handleMediaSelect}
          onClose={() => setShowMediaPicker(false)}
        />
      )}

      {showVideoPicker && (
        <VideoPicker
          onSelect={handleVideoSelect}
          onClose={() => setShowVideoPicker(false)}
        />
      )}
    </>
  )
}
