"use client";

import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

interface ImageLightboxProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  src: string;
  alt?: string;
}

export function ImageLightbox({
  open,
  onOpenChange,
  src,
  alt = "Imagen",
}: ImageLightboxProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] border-[var(--gold)]/30 bg-black/95 p-0 overflow-hidden">
        <div className="relative flex items-center justify-center min-h-[70vh] p-4">
          <img
            src={src}
            alt={alt}
            className="max-h-[90vh] w-auto object-contain rounded-lg shadow-2xl"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
