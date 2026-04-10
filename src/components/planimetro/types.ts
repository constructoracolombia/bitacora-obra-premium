export interface Ambiente {
  id: string;
  nombre: string;
  x: number;
  y: number;
  largo: number;
  ancho: number;
  area_piso: number;
  perimetro: number;
  area_muros: number;
}

export interface ResultadoPlanimetro {
  unidad: string;
  escala: string | null;
  altura_piso_a_piso: number;
  ambientes: Ambiente[];
  resumen: {
    area_total_piso: number;
    area_total_muros: number;
    perimetro_exterior: number | null;
  };
  advertencias: string[];
}
