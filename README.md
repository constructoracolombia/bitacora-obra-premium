# Bitácora Obra Premium

Aplicación de gestión de bitácora de obra construida con Next.js 16, App Router y un tema oscuro premium con acentos dorados.

## Stack Tecnológico

- **Framework:** Next.js 16 (App Router)
- **Lenguaje:** TypeScript
- **Estilos:** Tailwind CSS v4
- **Componentes:** shadcn/ui
- **Iconos:** lucide-react
- **Base de datos:** Supabase (@supabase/supabase-js)
- **Fechas:** date-fns
- **Gráficos:** recharts

## Tema Personalizado

- **Color primario:** #FFB800 (dorado)
- **Fondo oscuro:** #0C0C0C
- **Cards:** #1A1A1A
- **Efectos:** Glassmorphism con backdrop-blur

### Clases de utilidad glassmorphism

- `.glass` - Fondo translúcido con blur
- `.glass-card` - Cards con efecto glass
- `.glass-primary` - Acento dorado translúcido

## Configuración

1. **Variables de entorno:** Copia `.env.example` a `.env.local` y configura tus credenciales de Supabase:

```bash
cp .env.example .env.local
```

2. **Supabase:** Obtén las credenciales en [supabase.com/dashboard](https://supabase.com/dashboard)

## Desarrollo

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## Build

```bash
npm run build
npm start
```

## Estructura del Proyecto

```
src/
├── app/              # App Router (páginas, layout)
├── components/       # Componentes React
│   ├── charts/       # Gráficos (recharts)
│   └── ui/           # Componentes shadcn/ui
└── lib/              # Utilidades y configuración
    ├── supabase/     # Cliente Supabase
    └── utils.ts      # Utilidades (cn, etc.)
```
