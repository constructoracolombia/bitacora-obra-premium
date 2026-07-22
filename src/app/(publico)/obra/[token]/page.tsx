"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Calendar, PlayCircle } from "lucide-react";

type Foto = { id: string; foto_url: string; orden: number };

type Entrada = {
  id: string;
  fecha: string;
  titulo: string;
  descripcion: string | null;
  video_url: string | null;
  bitacora_fotos: Foto[];
};

type Proyecto = { id: string; cliente_nombre: string | null };

const BG = "#FAF8F4";
const CARD = "#FFFFFF";
const GOLD = "#B0894F";
const TEXT = "#111D2E";
const TEXT2 = "#6B7280";

function videoEmbedUrl(url: string): string | null {
  const yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([\w-]{11})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  return null;
}

export default function ObraPublicaPage() {
  const { token } = useParams<{ token: string }>();
  const [proyecto, setProyecto] = useState<Proyecto | null>(null);
  const [entradas, setEntradas] = useState<Entrada[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await fetch(`/api/obra/${token}`);
      if (!res.ok) {
        setError("Este link no es válido o el proyecto no fue encontrado.");
        setLoading(false);
        return;
      }
      const data = await res.json() as { proyecto: Proyecto; entradas: Entrada[] };
      setProyecto(data.proyecto);
      setEntradas(data.entradas);
      setLoading(false);
    })();
  }, [token]);

  if (loading) {
    return (
      <div style={{ background: BG, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: GOLD, fontFamily: "serif", fontSize: 18 }}>Cargando…</div>
      </div>
    );
  }

  if (error || !proyecto) {
    return (
      <div style={{ background: BG, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ color: GOLD, fontSize: 40, marginBottom: 12 }}>⚠</div>
          <p style={{ color: TEXT, fontFamily: "serif", fontSize: 20, marginBottom: 8 }}>Link no disponible</p>
          <p style={{ color: TEXT2, fontSize: 14 }}>{error ?? "Proyecto no encontrado."}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: BG, minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      {/* HEADER (oscuro — identidad de marca) */}
      <div style={{ background: "#111D2E", borderBottom: `2px solid ${GOLD}`, padding: "16px 20px", textAlign: "center" }}>
        <p style={{ color: GOLD, fontSize: 11, letterSpacing: 3, fontWeight: 700, marginBottom: 2, textTransform: "uppercase" }}>
          Constructora Colombia
        </p>
        <p style={{ color: "#FAF8F4", fontFamily: "Georgia, serif", fontSize: 22, fontWeight: 700, margin: 0 }}>
          BITÁCORA DE OBRA
        </p>
        <p style={{ color: "#D4C9B8", fontSize: 11, marginTop: 2, opacity: 0.7 }}>constructoracolombia.com</p>
      </div>

      <div style={{ maxWidth: 560, margin: "0 auto", padding: "20px 16px 48px" }}>
        {/* HERO */}
        <div style={{ background: CARD, borderRadius: 16, padding: 24, marginBottom: 20, border: `1px solid rgba(176,137,79,0.25)`, boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}>
          <p style={{ color: GOLD, fontSize: 10, letterSpacing: 2, fontWeight: 700, textTransform: "uppercase", marginBottom: 8 }}>
            Avances de tu obra
          </p>
          <p style={{ color: TEXT, fontFamily: "Georgia, serif", fontSize: 26, fontWeight: 700, margin: 0, lineHeight: 1.2 }}>
            {proyecto.cliente_nombre ?? "Tu proyecto"}
          </p>
        </div>

        {/* FEED */}
        {entradas.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 16px", color: TEXT2, fontSize: 14 }}>
            Aún no hay avances registrados para este proyecto.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {entradas.map((entrada) => {
              const embed = entrada.video_url ? videoEmbedUrl(entrada.video_url) : null;
              return (
                <div
                  key={entrada.id}
                  style={{ background: CARD, borderRadius: 16, padding: 20, border: "1px solid rgba(17,29,46,0.08)", boxShadow: "0 1px 8px rgba(0,0,0,0.05)" }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6, color: TEXT2, fontSize: 12, marginBottom: 8 }}>
                    <Calendar size={13} color={GOLD} />
                    {new Date(entrada.fecha).toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" })}
                  </div>

                  <p style={{ color: TEXT, fontFamily: "Georgia, serif", fontSize: 19, fontWeight: 700, margin: "0 0 8px" }}>
                    {entrada.titulo}
                  </p>

                  {entrada.descripcion && (
                    <p style={{ color: TEXT2, fontSize: 14, lineHeight: 1.5, margin: "0 0 12px", whiteSpace: "pre-wrap" }}>
                      {entrada.descripcion}
                    </p>
                  )}

                  {entrada.bitacora_fotos.length > 0 && (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, marginBottom: entrada.video_url ? 12 : 0 }}>
                      {entrada.bitacora_fotos.map((foto) => (
                        <a key={foto.id} href={foto.foto_url} target="_blank" rel="noopener noreferrer">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={foto.foto_url}
                            alt={entrada.titulo}
                            style={{ width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: 8, display: "block" }}
                          />
                        </a>
                      ))}
                    </div>
                  )}

                  {entrada.video_url && (
                    embed ? (
                      <div style={{ position: "relative", paddingTop: "56.25%", borderRadius: 8, overflow: "hidden" }}>
                        <iframe
                          src={embed}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }}
                        />
                      </div>
                    ) : (
                      <a
                        href={entrada.video_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ display: "inline-flex", alignItems: "center", gap: 6, color: GOLD, fontSize: 13, fontWeight: 600, textDecoration: "none" }}
                      >
                        <PlayCircle size={16} /> Ver video
                      </a>
                    )
                  )}
                </div>
              );
            })}
          </div>
        )}

        <p style={{ textAlign: "center", color: TEXT2, fontSize: 11, marginTop: 32, opacity: 0.7 }}>
          Constructora Colombia © 2026 — Si tienes preguntas, contacta a tu residente de obra.
        </p>
      </div>
    </div>
  );
}
