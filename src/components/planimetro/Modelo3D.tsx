'use client';

import { Suspense, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html, Grid, Environment } from '@react-three/drei';
import * as THREE from 'three';
import type { ResultadoPlanimetro, Ambiente } from './types';

const COLORES = [
  '#4A9EFF', '#34C759', '#FF9500', '#FF6B6B', '#AF52DE',
  '#5AC8FA', '#FFCC00', '#FF6B35', '#4CD964', '#007AFF',
];

const ALTURA_MURO_DEFAULT = 2.6;
const GROSOR_MURO = 0.15;

interface AmbienteBoxProps {
  ambiente: Ambiente;
  color: string;
  altura: number;
  seleccionado: boolean;
  onSelect: () => void;
}

function AmbienteBox({ ambiente, color, altura, seleccionado, onSelect }: AmbienteBoxProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame(() => {
    if (meshRef.current) {
      const target = seleccionado ? 1.05 : hovered ? 1.02 : 1;
      meshRef.current.scale.lerp(new THREE.Vector3(target, target, target), 0.1);
    }
  });

  const { x, y, largo, ancho } = ambiente;
  // Centrar la caja en su posición (x,y es esquina inferior izquierda)
  const cx = x + largo / 2;
  const cy = y + ancho / 2;

  const colorObj = new THREE.Color(color);

  return (
    <group position={[cx, 0, cy]}>
      {/* Piso */}
      <mesh
        ref={meshRef}
        position={[0, 0.01, 0]}
        onClick={onSelect}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <boxGeometry args={[largo, 0.05, ancho]} />
        <meshStandardMaterial
          color={colorObj}
          opacity={seleccionado ? 0.9 : 0.7}
          transparent
          roughness={0.4}
          metalness={0.1}
        />
      </mesh>

      {/* Muro Norte */}
      <mesh position={[0, altura / 2, -ancho / 2 + GROSOR_MURO / 2]}>
        <boxGeometry args={[largo, altura, GROSOR_MURO]} />
        <meshStandardMaterial color={colorObj} opacity={0.85} transparent roughness={0.6} />
      </mesh>
      {/* Muro Sur */}
      <mesh position={[0, altura / 2, ancho / 2 - GROSOR_MURO / 2]}>
        <boxGeometry args={[largo, altura, GROSOR_MURO]} />
        <meshStandardMaterial color={colorObj} opacity={0.85} transparent roughness={0.6} />
      </mesh>
      {/* Muro Oeste */}
      <mesh position={[-largo / 2 + GROSOR_MURO / 2, altura / 2, 0]}>
        <boxGeometry args={[GROSOR_MURO, altura, ancho]} />
        <meshStandardMaterial color={colorObj} opacity={0.85} transparent roughness={0.6} />
      </mesh>
      {/* Muro Este */}
      <mesh position={[largo / 2 - GROSOR_MURO / 2, altura / 2, 0]}>
        <boxGeometry args={[GROSOR_MURO, altura, ancho]} />
        <meshStandardMaterial color={colorObj} opacity={0.85} transparent roughness={0.6} />
      </mesh>

      {/* Etiqueta */}
      {(hovered || seleccionado) && (
        <Html position={[0, altura + 0.3, 0]} center>
          <div className="pointer-events-none rounded-lg bg-white/95 px-3 py-2 shadow-lg text-center min-w-[120px]">
            <p className="text-xs font-bold text-gray-800">{ambiente.nombre}</p>
            <p className="text-xs text-gray-500">{ambiente.area_piso.toFixed(2)} m²</p>
          </div>
        </Html>
      )}
    </group>
  );
}

function Escena({ data, seleccionado, onSelect }: {
  data: ResultadoPlanimetro;
  seleccionado: string | null;
  onSelect: (id: string | null) => void;
}) {
  const altura = data.altura_piso_a_piso || ALTURA_MURO_DEFAULT;

  // Calcular centro del modelo para centrarlo en la escena
  const maxX = Math.max(...data.ambientes.map((a) => a.x + a.largo));
  const maxY = Math.max(...data.ambientes.map((a) => a.y + a.ancho));
  const offsetX = maxX / 2;
  const offsetY = maxY / 2;

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 15, 10]} intensity={1.2} castShadow />
      <directionalLight position={[-5, 8, -5]} intensity={0.4} />

      <group position={[-offsetX, 0, -offsetY]}>
        {data.ambientes.map((ambiente, i) => (
          <AmbienteBox
            key={ambiente.id}
            ambiente={ambiente}
            color={COLORES[i % COLORES.length]}
            altura={altura}
            seleccionado={seleccionado === ambiente.id}
            onSelect={() => onSelect(seleccionado === ambiente.id ? null : ambiente.id)}
          />
        ))}
      </group>

      <Grid
        args={[50, 50]}
        position={[0, 0, 0]}
        cellColor="#e5e7eb"
        sectionColor="#d1d5db"
        cellSize={1}
        sectionSize={5}
        fadeDistance={30}
        infiniteGrid
      />

      <OrbitControls
        makeDefault
        minDistance={3}
        maxDistance={60}
        maxPolarAngle={Math.PI / 2.05}
      />
    </>
  );
}

interface Props {
  data: ResultadoPlanimetro;
}

export function Modelo3D({ data }: Props) {
  const [seleccionado, setSeleccionado] = useState<string | null>(null);
  const ambienteSelec = data.ambientes.find((a) => a.id === seleccionado);

  if (!data.ambientes.length) return null;

  return (
    <div className="space-y-3">
      <div className="relative h-[420px] overflow-hidden rounded-xl border border-gray-200 bg-[#F7F8FA]">
        <Canvas
          camera={{ position: [8, 10, 12], fov: 45 }}
          shadows
          gl={{ antialias: true }}
        >
          <Suspense fallback={null}>
            <Escena data={data} seleccionado={seleccionado} onSelect={setSeleccionado} />
          </Suspense>
        </Canvas>

        {/* Controles hint */}
        <div className="absolute bottom-3 left-3 flex items-center gap-2">
          <span className="rounded-full bg-white/90 px-3 py-1 text-[11px] text-gray-500 shadow-sm">
            🖱 Arrastrar para rotar · Scroll para zoom · Click en ambiente para detalle
          </span>
        </div>

        {/* Panel detalle del ambiente seleccionado */}
        {ambienteSelec && (
          <div className="absolute right-3 top-3 rounded-xl bg-white/95 p-4 shadow-lg min-w-[180px]">
            <div className="flex items-center gap-2 mb-3">
              <span
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: COLORES[data.ambientes.indexOf(ambienteSelec) % COLORES.length] }}
              />
              <p className="font-semibold text-gray-800 text-sm">{ambienteSelec.nombre}</p>
            </div>
            <div className="space-y-1.5 text-xs text-gray-600">
              <div className="flex justify-between gap-4">
                <span>Largo</span>
                <span className="font-medium text-gray-800">{ambienteSelec.largo} m</span>
              </div>
              <div className="flex justify-between gap-4">
                <span>Ancho</span>
                <span className="font-medium text-gray-800">{ambienteSelec.ancho} m</span>
              </div>
              <div className="border-t border-gray-100 pt-1.5">
                <div className="flex justify-between gap-4">
                  <span>Área piso</span>
                  <span className="font-bold text-[#007AFF]">{ambienteSelec.area_piso.toFixed(2)} m²</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span>Área muros</span>
                  <span className="font-bold text-green-600">{ambienteSelec.area_muros.toFixed(2)} m²</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Leyenda de colores */}
      <div className="flex flex-wrap gap-2">
        {data.ambientes.map((a, i) => (
          <button
            key={a.id}
            onClick={() => setSeleccionado(seleccionado === a.id ? null : a.id)}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs transition-all ${
              seleccionado === a.id
                ? 'bg-gray-800 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: COLORES[i % COLORES.length] }}
            />
            {a.nombre}
          </button>
        ))}
      </div>
    </div>
  );
}
