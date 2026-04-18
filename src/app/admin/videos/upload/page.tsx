import { redirect } from "next/navigation"

// Video upload is integrated directly into the Admin → Videos page (drag-drop
// zone + progress bar). This sub-route redirects there so any bookmarks or
// old links still land in the right place.
export default function VideoUploadPage() {
  redirect("/admin/videos")
}
