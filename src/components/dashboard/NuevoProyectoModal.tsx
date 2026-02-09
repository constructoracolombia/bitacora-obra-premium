"use client";

import { Building2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface NuevoProyectoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function NuevoProyectoModal({
  open,
  onOpenChange,
}: NuevoProyectoModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-gray-200 bg-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[#2D3748]">Crear Proyecto</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 py-6 text-center">
          <Building2 className="size-12 text-amber-500" />
          <p className="text-gray-700">
            Los proyectos se gestionan desde <strong>Finanzas</strong>.
          </p>
          <p className="text-sm text-gray-500">
            Para crear o editar un proyecto, utiliza la aplicación de Finanzas.
            Los proyectos aparecerán automáticamente aquí.
          </p>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="mt-2 border-gray-200"
          >
            Entendido
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
