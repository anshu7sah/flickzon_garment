"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { createClientNote, deleteClientNote } from "@/actions/clients";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Plus, Trash2, MessageSquare, Clock } from "lucide-react";
import type { SerializedClientNote } from "@/types";

interface NotesTabProps {
  clientId: string;
  notes: SerializedClientNote[];
  canManage: boolean;
}

export default function NotesTab({ clientId, notes, canManage }: NotesTabProps) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleAdd = async () => {
    if (!content.trim()) return;
    setSaving(true);
    const result = await createClientNote({ clientId, content: content.trim() });
    setSaving(false);
    if (result.success) {
      toast.success("Note added");
      setContent("");
      router.refresh();
    } else {
      toast.error(result.error);
    }
  };

  const handleDelete = async (noteId: string) => {
    setDeletingId(noteId);
    const result = await deleteClientNote(noteId, clientId);
    setDeletingId(null);
    if (result.success) {
      toast.success("Note deleted");
      router.refresh();
    } else {
      toast.error(result.error);
    }
  };

  return (
    <div className="space-y-6">
      {canManage && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              <Textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="Add an internal note..."
                rows={3}
                className="resize-none"
              />
              <div className="flex justify-end">
                <Button onClick={handleAdd} disabled={saving || !content.trim()} className="gap-2" size="sm">
                  <Plus className="h-4 w-4" />
                  {saving ? "Adding..." : "Add Note"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {notes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MessageSquare className="h-8 w-8 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No notes yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {notes.map(note => (
            <Card key={note.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 whitespace-pre-wrap break-words">{note.content}</p>
                    <div className="flex items-center gap-3 mt-3">
                      <Badge variant="outline" className="text-xs gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDate(note.createdAt)}
                      </Badge>
                    </div>
                  </div>
                  {canManage && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-gray-400 hover:text-red-500 shrink-0"
                      onClick={() => handleDelete(note.id)}
                      disabled={deletingId === note.id}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
