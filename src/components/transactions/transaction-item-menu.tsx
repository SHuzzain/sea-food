"use client";

import { Download, MessageCircle, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

export function TransactionItemMenu({
  onDownload,
  onWhatsApp,
  onEdit,
  onDelete,
  downloadLabel = "Download",
  whatsappLabel = "WhatsApp"
}: {
  onDownload?: () => void | Promise<void>;
  onWhatsApp?: () => void | Promise<void>;
  onEdit?: () => void;
  onDelete?: () => void | Promise<void>;
  downloadLabel?: string;
  whatsappLabel?: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0" aria-label="More actions">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {onDownload ? (
          <DropdownMenuItem className="gap-2" onClick={() => void onDownload()}>
            <Download className="h-4 w-4" />
            {downloadLabel}
          </DropdownMenuItem>
        ) : null}
        {onWhatsApp ? (
          <DropdownMenuItem className="gap-2" onClick={() => void onWhatsApp()}>
            <MessageCircle className="h-4 w-4" />
            {whatsappLabel}
          </DropdownMenuItem>
        ) : null}
        {onEdit || onDelete ? <DropdownMenuSeparator /> : null}
        {onEdit ? (
          <DropdownMenuItem className="gap-2" onClick={onEdit}>
            <Pencil className="h-4 w-4" />
            Edit
          </DropdownMenuItem>
        ) : null}
        {onDelete ? (
          <DropdownMenuItem className="gap-2 text-destructive focus:text-destructive" onClick={() => void onDelete()}>
            <Trash2 className="h-4 w-4" />
            Delete
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}