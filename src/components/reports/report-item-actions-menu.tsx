"use client";

import { Download, MessageCircle, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

export function ReportItemActionsMenu({
  onDownload,
  onWhatsApp,
  downloadLabel = "Download",
  whatsappLabel = "WhatsApp"
}: {
  onDownload: () => void | Promise<void>;
  onWhatsApp: () => void | Promise<void>;
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
        <DropdownMenuItem className="gap-2" onClick={() => void onDownload()}>
          <Download className="h-4 w-4" />
          {downloadLabel}
        </DropdownMenuItem>
        <DropdownMenuItem className="gap-2" onClick={() => void onWhatsApp()}>
          <MessageCircle className="h-4 w-4" />
          {whatsappLabel}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}