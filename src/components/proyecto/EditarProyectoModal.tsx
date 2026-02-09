"use client";

import { Building2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface EditarProyectoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditarProyectoModal({ open, onOpenChange }: EditarProyectoModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-[#D2D2D7]/60 bg-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[15px] font-semibold text-[#1D1D1F]">Editar Proyecto</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 py-6 text-center">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-[#FF9500]/10">
            <Building2 className="size-8 text-[#FF9500]" />
          </div>
          <p className="text-[15px] text-[#1D1D1F]">
            Los proyectos se gestionan desde <strong>Finanzas</strong>.
          </p>
          <p className="text-[13px] text-[#86868B]">
            Para editar los datos del proyecto, utiliza la aplicación de Finanzas. Los cambios se reflejarán aquí automáticamente.
          </p>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="mt-2 rounded-xl border-[#D2D2D7]"
          >
            Entendido
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
