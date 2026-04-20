import { Node, mergeAttributes } from "@tiptap/core"

/**
 * A generic video embed node that renders any iframe-embeddable URL
 * (HubSpot Video, Synthesia, YouTube, Vimeo, …) as a 16:9 responsive iframe.
 *
 * Stored in Tiptap JSON as:
 *   { type: "videoEmbed", attrs: { src: "https://...", title: "…" } }
 */
export const VideoEmbed = Node.create({
  name: "videoEmbed",

  group: "block",
  atom: true, // treat as a single opaque unit in the editor
  draggable: true,

  addAttributes() {
    return {
      src: { default: null },
      title: { default: "" },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="videoEmbed"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(
        { "data-type": "videoEmbed", class: "video-embed-wrapper" },
      ),
      [
        "iframe",
        mergeAttributes(
          {
            src: HTMLAttributes.src,
            title: HTMLAttributes.title ?? "",
            allow: "autoplay; fullscreen; encrypted-media",
            allowfullscreen: "true",
            referrerpolicy: "origin",
            sandbox:
              "allow-forms allow-scripts allow-same-origin allow-popups",
          },
        ),
      ],
    ]
  },
})
