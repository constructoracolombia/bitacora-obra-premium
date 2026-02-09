"use client";

import { useState } from "react";
import { Diamond, Edit3, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface GanttActivity {
  id: string;
  actividad: string;
  fecha_inicio: string;
  fecha_fin: string;
  estado: string;
  hito_critico: boolean;
  porcentaje_avance: number;
}

interface ActivitySidePanelProps {
  activities: GanttActivity[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onUpdateProgress: (id: string, porcentaje: number) => Promise<void>;
}

const ESTADO_LABELS: Record<string, string> = {
  PENDING: "Pendiente",
  IN_PROGRESS: "En progreso",
  COMPLETED: "Completado",
  DELAYED: "Retrasado",
};

const ESTADO_COLORS: Record<string, string> = {
  PENDING: "bg-[#F5F5F7] text-[#86868B]",
  IN_PROGRESS: "bg-[#007AFF]/10 text-[#007AFF]",
  COMPLETED: "bg-[#34C759]/10 text-[#34C759]",
  DELAYED: "bg-[#FF3B30]/10 text-[#FF3B30]",
};

export function ActivitySidePanel({
  activities,
  selectedId,
  onSelect,
  onUpdateProgress,
}: ActivitySidePanelProps) {
  const [editModal, setEditModal] = useState<{
    open: boolean;
    activity: GanttActivity | null;
    porcentaje: string;
  }>({ open: false, activity: null, porcentaje: "" });
  const [saving, setSaving] = useState(false);

  async function handleSaveProgress() {
    if (!editModal.activity) return;
    const pct = Math.min(100, Math.max(0, parseInt(editModal.porcentaje) || 0));
    setSaving(true);
    try {
      await onUpdateProgress(editModal.activity.id, pct);
      setEditModal({ open: false, activity: null, porcentaje: "" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex w-72 shrink-0 flex-col rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="mb-4 font-semibold text-[#1D1D1F]">
        Actividades ({activities.length})
      </h3>
      <div className="flex-1 space-y-2 overflow-y-auto">
        {activities.map((act) => {
          const isSelected = selectedId === act.id;
          const isOverdue =
            new Date(act.fecha_fin) < new Date() && act.estado !== "COMPLETED";

          return (
            <div
              key={act.id}
              onClick={() => onSelect(isSelected ? null : act.id)}
              className={cn(
                "cursor-pointer rounded-lg border p-3 transition-colors",
                isSelected
                  ? "border-blue-500 bg-blue-50"
                  : "border-[#D2D2D7] hover:border-[#007AFF]/30 hover:bg-[#F5F5F7]"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="truncate text-sm font-medium">
                  {act.actividad}
                </span>
                {act.hito_critico && (
                  <Diamond className="size-4 shrink-0 text-[#007AFF]" />
                )}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <Progress
                  value={act.porcentaje_avance}
                  className="h-2 flex-1"
                />
                <span className="text-xs text-muted-foreground">
                  {act.porcentaje_avance}%
                </span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <span
                  className={cn(
                    "rounded px-1.5 py-0.5 text-xs",
                    ESTADO_COLORS[act.estado] ?? ESTADO_COLORS.PENDING
                  )}
                >
                  {ESTADO_LABELS[act.estado] ?? act.estado}
                </span>
                {isOverdue && (
                  <span className="flex items-center gap-0.5 text-xs text-destructive">
                    <Bell className="size-3" />
                    Retrasado
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {format(new Date(act.fecha_inicio), "d MMM", { locale: es })} -{" "}
                {format(new Date(act.fecha_fin), "d MMM yyyy", { locale: es })}
              </p>
              <Button
                size="sm"
                variant="outline"
                className="mt-2 w-full border-gray-200 text-xs hover:bg-blue-50"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditModal({
                    open: true,
                    activity: act,
                    porcentaje: String(act.porcentaje_avance),
                  });
                }}
              >
                <Edit3 className="size-3" />
                Actualizar progreso
              </Button>
            </div>
          );
        })}
      </div>

      <Dialog
        open={editModal.open}
        onOpenChange={(open) =>
          setEditModal((prev) => ({ ...prev, open }))
        }
      >
        <DialogContent className="border-gray-200 bg-white">
          <DialogHeader>
            <DialogTitle className="text-[#1D1D1F]">
              Actualizar progreso
            </DialogTitle>
          </DialogHeader>
          {editModal.activity && (
            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">
                {editModal.activity.actividad}
              </p>
              <div className="space-y-2">
                <Label>Porcentaje de avance (0-100)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={editModal.porcentaje}
                  onChange={(e) =>
                    setEditModal((prev) => ({
                      ...prev,
                      porcentaje: e.target.value,
                    }))
                  }
                  className="h-12 text-lg"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditModal({ open: false, activity: null, porcentaje: "" })}
            >
              Cancelar
            </Button>
            <Button
              className="bg-[#007AFF] text-white shadow-sm hover:bg-[#0051D5]"
              onClick={handleSaveProgress}
              disabled={saving}
            >
              {saving ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
