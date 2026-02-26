import { Edge, Node } from '@xyflow/react';
import { motion } from 'framer-motion';
import {
  useCallback,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import ForceGraph3D, { type ForceGraphMethods } from 'react-force-graph-3d';
import {
  AdditiveBlending,
  AmbientLight,
  BackSide,
  CanvasTexture,
  Color,
  DirectionalLight,
  DoubleSide,
  FogExp2,
  Group,
  HemisphereLight,
  IcosahedronGeometry,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  PointLight,
  ShaderMaterial,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  TorusGeometry,
} from 'three';
import SpriteText from 'three-spritetext';

import TopologyControls, {
  MappingDesign,
  TopologyViewMode,
} from '../../components/topology/TopologyControls';
import type { MappingThemeConfig } from '../../lib/mapping-themes';
import { DEVICE_TYPE_COLORS } from './constants';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TopologyNodeData {
  label?: string;
  ip?: string;
  deviceType?: string;
  isOnline?: boolean;
  responseTime?: number;
  riskScore?: number;
}

interface Topology3DNode {
  id: string;
  label: string;
  deviceType: string;
  isOnline: boolean;
  responseTime: number | null;
  riskScore: number;
  color: string;
  val: number;
  degree: number;
  x: number;
  y: number;
  z: number;
}

interface Topology3DLink {
  source: string;
  target: string;
  color: string;
  width: number;
  particles: number;
  speed: number;
  curvature: number;
}

interface OrbitControlsLike {
  autoRotate?: boolean;
  autoRotateSpeed?: number;
  enableDamping?: boolean;
  dampingFactor?: number;
  minDistance?: number;
  maxDistance?: number;
  rotateSpeed?: number;
  enablePan?: boolean;
}

interface D3ForceLike {
  strength?: (value: number) => void;
  distance?: (value: number) => void;
}

interface TopologyCanvas3DProps {
  viewMode?: TopologyViewMode;
  onViewModeChange?: (mode: TopologyViewMode) => void;
  bgColor: string;
  isDark: boolean;
  isLocked: boolean;
  mappingDesign: MappingDesign;
  themeConfig: MappingThemeConfig;
  nodes: Node[];
  enhancedEdges: Edge[];
  onNodeSelect: (nodeId: string) => void;
  onLockToggle: () => void;
  onDesignChange: (design: MappingDesign) => void;
  isAutoPlay?: boolean;
  onAutoPlayToggle?: () => void;
  onGenerateReport?: () => void;
  isGeneratingReport?: boolean;
  assistantOverlay?: ReactNode;
}

// ─── Utility helpers ──────────────────────────────────────────────────────────

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function resolve3DBackground(bgColor: string, isDark: boolean): string {
  const trimmed = bgColor.trim().toLowerCase();
  if (trimmed.startsWith('linear-gradient')) {
    return isDark ? '#030712' : '#c8d8ef';
  }
  if (trimmed === '' || trimmed === 'transparent') {
    return isDark ? '#020617' : '#c5d5ed';
  }
  return bgColor;
}

function resolveNodeDepth(deviceType: string, riskScore: number, degree: number): number {
  switch (deviceType) {
    case 'ROUTER':
      return 74;
    case 'SWITCH':
    case 'ACCESS_POINT':
    case 'FIREWALL':
      return 36;
    case 'SERVER':
    case 'NAS':
      return 24;
    default:
      return riskScore >= 70 ? 30 : clamp(10 + degree * 4, 10, 28);
  }
}

function trimLabel(label: string): string {
  if (label.length <= 24) {
    return label;
  }
  return `${label.slice(0, 21)}...`;
}

// ─── Texture factories ───────────────────────────────────────────────────────

function createGlowTexture(): CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  if (!context) {
    return new CanvasTexture(canvas);
  }

  const gradient = context.createRadialGradient(
    size / 2,
    size / 2,
    size * 0.04,
    size / 2,
    size / 2,
    size * 0.48,
  );
  gradient.addColorStop(0, 'rgba(255,255,255,1.0)');
  gradient.addColorStop(0.15, 'rgba(255,255,255,0.85)');
  gradient.addColorStop(0.4, 'rgba(255,255,255,0.35)');
  gradient.addColorStop(0.7, 'rgba(255,255,255,0.08)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');

  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);

  const texture = new CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

/** Create a subtle hex-grid ground plane for spatial depth reference. */
function createGroundPlane(isDark: boolean, accentColor: Color): Mesh {
  const geometry = new PlaneGeometry(3200, 3200, 1, 1);
  const material = new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    uniforms: {
      uColor: { value: accentColor },
      uOpacity: { value: isDark ? 0.12 : 0.06 },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uOpacity;
      varying vec2 vUv;

      void main() {
        vec2 p = vUv * 60.0;
        float lineX = smoothstep(0.0, 0.06, abs(fract(p.x) - 0.5));
        float lineY = smoothstep(0.0, 0.06, abs(fract(p.y) - 0.5));
        float grid = 1.0 - min(lineX, lineY);
        float fade = 1.0 - smoothstep(0.2, 0.5, length(vUv - 0.5));
        float alpha = grid * fade * uOpacity;
        gl_FragColor = vec4(uColor, alpha);
      }
    `,
  });

  const mesh = new Mesh(geometry, material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = -120;
  return mesh;
}

// ─── Theme palettes ──────────────────────────────────────────────────────────

interface ThemePalette {
  accent: Color;
  accentSecondary: Color;
  fogColor: Color;
  fogDensity: number;
  emissiveBoost: number;
  shellOpacity: number;
  haloScale: number;
  particleSpeedMul: number;
  ringEmissive: number;
  labelBg: string;
  labelBgLight: string;
}

function getThemePalette(design: MappingDesign, isDark: boolean): ThemePalette {
  switch (design) {
    case 'cyber':
      return {
        accent: new Color('#22d3ee'),
        accentSecondary: new Color('#e879f9'),
        fogColor: new Color(isDark ? '#050a18' : '#e8f4ff'),
        fogDensity: isDark ? 0.0012 : 0.0006,
        emissiveBoost: 1.4,
        shellOpacity: 0.22,
        haloScale: 8.5,
        particleSpeedMul: 1.35,
        ringEmissive: 0.9,
        labelBg: 'rgba(2, 6, 23, 0.88)',
        labelBgLight: 'rgba(240, 249, 255, 0.94)',
      };
    case 'mesh':
      return {
        accent: new Color('#38bdf8'),
        accentSecondary: new Color('#2dd4bf'),
        fogColor: new Color(isDark ? '#040e1a' : '#eaf6ff'),
        fogDensity: isDark ? 0.001 : 0.0005,
        emissiveBoost: 1.1,
        shellOpacity: 0.18,
        haloScale: 7.0,
        particleSpeedMul: 0.9,
        ringEmissive: 0.65,
        labelBg: 'rgba(4, 14, 26, 0.85)',
        labelBgLight: 'rgba(240, 249, 255, 0.92)',
      };
    case 'starlink':
      return {
        accent: new Color('#818cf8'),
        accentSecondary: new Color('#c084fc'),
        fogColor: new Color(isDark ? '#010409' : '#eff1ff'),
        fogDensity: isDark ? 0.0015 : 0.0007,
        emissiveBoost: 1.6,
        shellOpacity: 0.14,
        haloScale: 10.0,
        particleSpeedMul: 0.7,
        ringEmissive: 0.75,
        labelBg: 'rgba(1, 4, 9, 0.90)',
        labelBgLight: 'rgba(238, 240, 255, 0.94)',
      };
    default:
      return {
        accent: new Color('#3b82f6'),
        accentSecondary: new Color('#818cf8'),
        fogColor: new Color(isDark ? '#050912' : '#edf4ff'),
        fogDensity: isDark ? 0.0008 : 0.0004,
        emissiveBoost: 1.0,
        shellOpacity: 0.16,
        haloScale: 6.5,
        particleSpeedMul: 1.0,
        ringEmissive: 0.55,
        labelBg: 'rgba(2, 6, 23, 0.82)',
        labelBgLight: 'rgba(248, 250, 252, 0.92)',
      };
  }
}

// ─── Shared geometries (created once) ────────────────────────────────────────

const CORE_GEO = new IcosahedronGeometry(1, 1);
const SHELL_GEO = new SphereGeometry(1, 32, 32);
const RING_GEO_A = new TorusGeometry(1.0, 0.04, 16, 96);
const RING_GEO_B = new TorusGeometry(1.15, 0.025, 16, 96);
const RISK_RING_GEO = new TorusGeometry(1.0, 0.06, 16, 72);

// ─── Component ───────────────────────────────────────────────────────────────

export function TopologyCanvas3D({
  viewMode = '2d',
  onViewModeChange,
  bgColor,
  isDark,
  isLocked,
  mappingDesign,
  themeConfig,
  nodes,
  enhancedEdges,
  onNodeSelect,
  onLockToggle,
  onDesignChange,
  isAutoPlay = false,
  onAutoPlayToggle,
  onGenerateReport,
  isGeneratingReport = false,
  assistantOverlay,
}: TopologyCanvas3DProps) {
  const graphRef = useRef<ForceGraphMethods<Topology3DNode, Topology3DLink> | undefined>(
    undefined,
  );
  const glowTextureRef = useRef<CanvasTexture | null>(null);
  const groundPlaneRef = useRef<Mesh | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const threeBackground = useMemo(
    () => resolve3DBackground(bgColor, isDark),
    [bgColor, isDark],
  );
  const palette = useMemo(() => getThemePalette(mappingDesign, isDark), [mappingDesign, isDark]);

  // ── Texture + cleanup ──────────────────────────────────────────────────────

  useEffect(() => {
    glowTextureRef.current = createGlowTexture();
    return () => {
      glowTextureRef.current?.dispose();
      glowTextureRef.current = null;
    };
  }, []);

  // ── Container sizing ───────────────────────────────────────────────────────

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const updateDimensions = () => {
      setDimensions({
        width: Math.max(1, Math.round(container.clientWidth)),
        height: Math.max(1, Math.round(container.clientHeight)),
      });
    };

    updateDimensions();

    const resizeObserver = new ResizeObserver(() => {
      updateDimensions();
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // ── Build graph data ───────────────────────────────────────────────────────

  const graphData = useMemo(() => {
    const nodeIds = new Set(nodes.map((node) => String(node.id)));
    const degreeByNode = new Map<string, number>();
    const resolvedEdges = enhancedEdges
      .map((edge) => {
        const source = String(edge.source);
        const target = String(edge.target);
        if (!nodeIds.has(source) || !nodeIds.has(target)) {
          return null;
        }

        degreeByNode.set(source, (degreeByNode.get(source) ?? 0) + 1);
        degreeByNode.set(target, (degreeByNode.get(target) ?? 0) + 1);
        return edge;
      })
      .filter((edge): edge is Edge => edge !== null);

    const mappedNodes: Topology3DNode[] = nodes.map((node) => {
      const data = (node.data ?? {}) as TopologyNodeData;
      const deviceType = typeof data.deviceType === 'string' ? data.deviceType : 'UNKNOWN';
      const riskScore = Number.isFinite(data.riskScore) ? Number(data.riskScore) : 0;
      const responseTime = Number.isFinite(data.responseTime)
        ? Number(data.responseTime)
        : null;
      const isOnline = data.isOnline !== false;
      const label = data.label?.trim() || data.ip?.trim() || String(node.id);
      const id = String(node.id);
      const degree = degreeByNode.get(id) ?? 0;

      return {
        id,
        label,
        deviceType,
        isOnline,
        responseTime,
        riskScore,
        color: DEVICE_TYPE_COLORS[deviceType] ?? '#94A3B8',
        val: clamp(0.95 + degree * 0.2 + riskScore / 200, 0.95, 2.25),
        degree,
        x: Number.isFinite(node.position?.x) ? Number(node.position.x) * 1.16 : 0,
        y: Number.isFinite(node.position?.y) ? -Number(node.position.y) * 1.04 : 0,
        z: resolveNodeDepth(deviceType, riskScore, degree),
      };
    });

    const mappedLinks: Topology3DLink[] = resolvedEdges.map((edge) => {
      const width =
        typeof edge.style?.strokeWidth === 'number'
          ? edge.style.strokeWidth
          : themeConfig.edgeWidth;
      const safeWidth = clamp(width, 1, 6);
      const baseParticles = mappingDesign === 'cyber' ? 5 : mappingDesign === 'mesh' ? 4 : 3;

      return {
        source: String(edge.source),
        target: String(edge.target),
        color: typeof edge.style?.stroke === 'string' ? edge.style.stroke : themeConfig.edgeColor,
        width: safeWidth,
        particles: clamp(Math.round(baseParticles + safeWidth / 2), 3, 8),
        speed:
          (mappingDesign === 'cyber' ? 0.01 + safeWidth * 0.001 : 0.007 + safeWidth * 0.0006) *
          palette.particleSpeedMul,
        curvature: mappingDesign === 'mesh' ? 0.05 : mappingDesign === 'cyber' ? 0.22 : 0.14,
      };
    });

    return { nodes: mappedNodes, links: mappedLinks };
  }, [enhancedEdges, mappingDesign, nodes, palette.particleSpeedMul, themeConfig.edgeColor, themeConfig.edgeWidth]);

  // ── Camera fly-in on data change ───────────────────────────────────────────

  useEffect(() => {
    const graph = graphRef.current;
    if (!graph || graphData.nodes.length === 0) {
      return;
    }

    graph.cameraPosition(
      { x: 60, y: 200, z: 680 },
      { x: 0, y: 0, z: 0 },
      1200,
    );
    graph.zoomToFit(1000, 140);
  }, [graphData.nodes.length, graphData.links.length]);

  // ── Orbit controls ─────────────────────────────────────────────────────────

  useEffect(() => {
    const graph = graphRef.current;
    if (!graph) {
      return;
    }

    const controls = graph.controls() as OrbitControlsLike;
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.enablePan = true;
    controls.minDistance = 80;
    controls.maxDistance = 2200;
    controls.rotateSpeed = 0.55;
    controls.autoRotate = isAutoPlay;
    controls.autoRotateSpeed = mappingDesign === 'cyber' ? 0.55 : 0.35;
  }, [isAutoPlay, mappingDesign]);

  // ── D3 forces ──────────────────────────────────────────────────────────────

  useEffect(() => {
    const graph = graphRef.current;
    if (!graph) {
      return;
    }

    const chargeForce = graph.d3Force('charge') as D3ForceLike | undefined;
    const linkForce = graph.d3Force('link') as D3ForceLike | undefined;
    chargeForce?.strength?.(
      mappingDesign === 'mesh' ? -170 : mappingDesign === 'cyber' ? -230 : -200,
    );
    linkForce?.distance?.(mappingDesign === 'mesh' ? 80 : mappingDesign === 'cyber' ? 70 : 75);
    linkForce?.strength?.(mappingDesign === 'cyber' ? 0.4 : 0.32);
    graph.d3ReheatSimulation();
  }, [mappingDesign, graphData.nodes.length, graphData.links.length]);

  // ── Cinematic lighting + fog + ground plane ────────────────────────────────

  useEffect(() => {
    const graph = graphRef.current;
    if (!graph) {
      return;
    }

    // Fog for depth atmosphere
    const scene = graph.scene();
    scene.fog = new FogExp2(palette.fogColor.getHex(), palette.fogDensity);

    // Ground plane
    if (groundPlaneRef.current) {
      scene.remove(groundPlaneRef.current);
      groundPlaneRef.current.geometry.dispose();
      (groundPlaneRef.current.material as ShaderMaterial).dispose();
    }
    const ground = createGroundPlane(isDark, palette.accent);
    scene.add(ground);
    groundPlaneRef.current = ground;

    // 3-point cinematic lighting
    const ambient = new AmbientLight(0xffffff, isDark ? 0.5 : 0.75);

    const hemisphere = new HemisphereLight(
      new Color(isDark ? '#38bdf8' : '#bfdbfe'),
      new Color(isDark ? '#020617' : '#e2e8f0'),
      isDark ? 0.65 : 0.45,
    );

    // Key light — bright directional
    const key = new DirectionalLight(0xffffff, isDark ? 1.5 : 1.15);
    key.position.set(200, 300, 250);

    // Fill light — colored accent
    const fill = new PointLight(palette.accent, isDark ? 2.2 : 1.4, 1400);
    fill.position.set(-260, 140, 300);

    // Rim light — secondary accent from behind
    const rim = new PointLight(palette.accentSecondary, isDark ? 1.6 : 0.9, 1100);
    rim.position.set(260, -140, -280);

    // Backlight — subtle glow from below/behind camera
    const backlight = new PointLight(
      new Color(isDark ? '#1e40af' : '#93c5fd'),
      isDark ? 0.8 : 0.4,
      1600,
    );
    backlight.position.set(0, -200, 500);

    graph.lights([ambient, hemisphere, key, fill, rim, backlight]);

    return () => {
      if (groundPlaneRef.current) {
        scene.remove(groundPlaneRef.current);
      }
    };
  }, [isDark, mappingDesign, palette]);

  // ── Node three object builder ──────────────────────────────────────────────

  const nodeThreeObject = useCallback(
    (node: Topology3DNode) => {
      const group = new Group();
      const baseColor = new Color(node.color);
      const radius = 2.2 + node.val * 1.1;

      // 1) Holographic icosahedron core
      const coreMat = new MeshPhysicalMaterial({
        color: baseColor.clone().lerp(new Color('#ffffff'), isDark ? 0.18 : 0.1),
        emissive: baseColor,
        emissiveIntensity: (node.isOnline ? 0.8 : 0.15) * palette.emissiveBoost * (isDark ? 1.0 : 1.4),
        metalness: isDark ? 0.6 : 0.45,
        roughness: isDark ? 0.12 : 0.18,
        clearcoat: 1.0,
        clearcoatRoughness: 0.08,
        reflectivity: 0.9,
      });
      const core = new Mesh(CORE_GEO, coreMat);
      core.scale.setScalar(radius);
      group.add(core);

      // 2) Wireframe overlay on core for sci-fi look
      const wireMat = new MeshStandardMaterial({
        color: baseColor.clone().lerp(new Color('#ffffff'), isDark ? 0.5 : 0.2),
        emissive: baseColor,
        emissiveIntensity: node.isOnline ? 0.4 * palette.emissiveBoost * (isDark ? 1.0 : 1.3) : 0.08,
        wireframe: true,
        transparent: true,
        opacity: node.isOnline ? 0.35 : 0.12,
      });
      const wireframe = new Mesh(CORE_GEO, wireMat);
      wireframe.scale.setScalar(radius * 1.01);
      group.add(wireframe);

      // 3) Outer energy shell (glass-like)
      const shellMat = new MeshPhysicalMaterial({
        color: baseColor.clone().lerp(new Color('#ffffff'), 0.35),
        emissive: baseColor,
        emissiveIntensity: node.isOnline ? 0.12 * palette.emissiveBoost : 0.04,
        metalness: 0.15,
        roughness: 0.05,
        transparent: true,
        opacity: node.isOnline ? palette.shellOpacity : 0.06,
        side: BackSide,
        clearcoat: 0.5,
        clearcoatRoughness: 0.15,
      });
      const shell = new Mesh(SHELL_GEO, shellMat);
      shell.scale.setScalar(radius * 1.45);
      // Breathing pulse animation
      if (node.isOnline) {
        shell.onBeforeRender = () => {
          const t = performance.now() * 0.001;
          const breathe = 1.42 + Math.sin(t * 1.5 + node.degree) * 0.06;
          shell.scale.setScalar(radius * breathe);
          shellMat.opacity = palette.shellOpacity + Math.sin(t * 2.0) * 0.04;
        };
      }
      group.add(shell);

      // 4) Primary orbital ring
      const ringMatA = new MeshPhysicalMaterial({
        color: baseColor.clone().lerp(new Color('#ffffff'), 0.12),
        emissive: baseColor,
        emissiveIntensity: node.isOnline ? palette.ringEmissive : 0.12,
        metalness: 0.7,
        roughness: 0.15,
        transparent: true,
        opacity: node.isOnline ? 0.9 : 0.3,
        clearcoat: 0.8,
      });
      const ringA = new Mesh(RING_GEO_A, ringMatA);
      ringA.scale.setScalar(radius * 1.35);
      ringA.rotation.x = Math.PI / 2;
      ringA.rotation.z = 0.35 + node.degree * 0.08;
      // Spinning animation
      if (node.isOnline) {
        ringA.onBeforeRender = () => {
          ringA.rotation.z += 0.004;
        };
      }
      group.add(ringA);

      // 5) Secondary orbital ring (perpendicular)
      const ringMatB = new MeshPhysicalMaterial({
        color: palette.accent.clone().lerp(baseColor, 0.3),
        emissive: palette.accent,
        emissiveIntensity: node.isOnline ? palette.ringEmissive * 0.6 : 0.06,
        metalness: 0.55,
        roughness: 0.2,
        transparent: true,
        opacity: node.isOnline ? 0.65 : 0.18,
        clearcoat: 0.6,
      });
      const ringB = new Mesh(RING_GEO_B, ringMatB);
      ringB.scale.setScalar(radius * 1.55);
      ringB.rotation.x = Math.PI * 0.3;
      ringB.rotation.y = Math.PI * 0.4 + node.degree * 0.12;
      if (node.isOnline) {
        ringB.onBeforeRender = () => {
          ringB.rotation.y -= 0.003;
          ringB.rotation.z += 0.001;
        };
      }
      group.add(ringB);

      // 6) Glow halo sprite — much subtler in light mode to avoid white blobs
      if (glowTextureRef.current) {
        const haloColor = baseColor.clone().lerp(palette.accent, isDark ? 0.2 : 0.5);
        const haloOpacity = isDark
          ? (node.isOnline ? 0.42 : 0.14)
          : (node.isOnline ? 0.08 : 0.03);
        const haloSizeMul = isDark ? palette.haloScale : Math.min(palette.haloScale, 4.5);
        const halo = new Sprite(
          new SpriteMaterial({
            map: glowTextureRef.current,
            color: haloColor,
            transparent: true,
            opacity: haloOpacity,
            depthWrite: false,
            blending: AdditiveBlending,
          }),
        );
        const haloSize = radius * (node.isOnline ? haloSizeMul : 3.5);
        halo.scale.set(haloSize, haloSize, 1);
        group.add(halo);

        // Secondary softer halo for extra glow depth (dark mode only)
        if (isDark && node.isOnline && palette.emissiveBoost > 1.0) {
          const halo2 = new Sprite(
            new SpriteMaterial({
              map: glowTextureRef.current,
              color: palette.accentSecondary,
              transparent: true,
              opacity: 0.15,
              depthWrite: false,
              blending: AdditiveBlending,
            }),
          );
          const h2Size = radius * palette.haloScale * 1.3;
          halo2.scale.set(h2Size, h2Size, 1);
          group.add(halo2);
        }
      }

      // 7) Risk alert beacon (pulsing red ring for high-risk)
      if (node.riskScore >= 75) {
        const riskMat = new MeshStandardMaterial({
          color: new Color('#ef4444'),
          emissive: new Color('#ef4444'),
          emissiveIntensity: 1.0,
          metalness: 0.3,
          roughness: 0.35,
          transparent: true,
          opacity: 0.85,
        });
        const warningRing = new Mesh(RISK_RING_GEO, riskMat);
        warningRing.scale.setScalar(radius * 2.0);
        warningRing.rotation.x = Math.PI / 2;
        warningRing.rotation.z = 0.6;
        // Pulsing animation
        warningRing.onBeforeRender = () => {
          const t = performance.now() * 0.001;
          const pulse = 0.6 + Math.sin(t * 3.0) * 0.3;
          riskMat.opacity = pulse;
          const s = radius * (1.9 + Math.sin(t * 2.0) * 0.15);
          warningRing.scale.setScalar(s);
        };
        group.add(warningRing);
      }

      // 8) Distance-based label — only visible when camera is close
      const labelText = trimLabel(node.label);
      const label = new SpriteText(labelText);
      label.textHeight = 1.2;
      label.color = isDark ? '#e2e8f0' : '#0f172a';
      label.backgroundColor = isDark ? palette.labelBg : palette.labelBgLight;
      label.padding = 3.5;
      label.borderRadius = 3;
      label.position.set(0, radius * 2.6, 0);
      label.material.transparent = true;
      label.material.depthWrite = false;
      // Fade based on camera distance
      label.onBeforeRender = (_renderer, _scene, camera) => {
        const dist = camera.position.distanceTo(label.getWorldPosition(label.position.clone().set(0, 0, 0)));
        // Fade in under 350 units, fully hidden beyond 500
        const opacity = 1.0 - Math.min(1.0, Math.max(0, (dist - 350) / 150));
        label.material.opacity = opacity;
        label.visible = opacity > 0.02;
      };
      group.add(label);

      return group;
    },
    [isDark, palette],
  );

  return (
    <div className="flex h-full flex-col">
      <motion.div
        className="relative flex-1 overflow-hidden"
        style={{
          background:
            isDark
              ? 'radial-gradient(ellipse at 50% 8%, #0c1a30 0%, #060e1f 30%, #030712 60%, #020509 100%)'
              : 'radial-gradient(ellipse at 45% 6%, #d6e4f5 0%, #c4d6ec 30%, #b8cce5 60%, #afc5e0 100%)',
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15, duration: 0.6 }}
      >
        {/* Atmospheric overlays */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {/* Nebula blobs */}
          <div
            className="absolute -top-32 -left-20 rounded-full blur-3xl"
            style={{
              width: '28rem',
              height: '28rem',
              background: isDark
                ? `radial-gradient(circle, ${palette.accent.getStyle()}33 0%, transparent 70%)`
                : `radial-gradient(circle, ${palette.accent.getStyle()}1a 0%, transparent 70%)`,
              animation: 'pulse 8s ease-in-out infinite',
            }}
          />
          <div
            className="absolute top-1/4 -right-24 rounded-full blur-3xl"
            style={{
              width: '34rem',
              height: '34rem',
              background: isDark
                ? `radial-gradient(circle, ${palette.accentSecondary.getStyle()}28 0%, transparent 70%)`
                : `radial-gradient(circle, ${palette.accentSecondary.getStyle()}14 0%, transparent 70%)`,
              animation: 'pulse 10s ease-in-out 2s infinite',
            }}
          />
          <div
            className="absolute bottom-[-18%] left-1/3 rounded-full blur-3xl"
            style={{
              width: '26rem',
              height: '26rem',
              background: isDark
                ? 'radial-gradient(circle, rgba(56,189,248,0.18) 0%, transparent 70%)'
                : 'radial-gradient(circle, rgba(56,189,248,0.10) 0%, transparent 70%)',
              animation: 'pulse 12s ease-in-out 4s infinite',
            }}
          />
          {/* Cross-gradient overlay */}
          <div
            className="absolute inset-0"
            style={{
              background: isDark
                ? `radial-gradient(circle at 50% 34%, ${palette.accent.getStyle()}22, transparent 56%), radial-gradient(circle at 15% 78%, ${palette.accentSecondary.getStyle()}18, transparent 54%)`
                : `radial-gradient(circle at 50% 34%, ${palette.accent.getStyle()}10, transparent 56%), radial-gradient(circle at 15% 78%, ${palette.accentSecondary.getStyle()}0a, transparent 54%)`,
            }}
          />
          {/* Subtle scan-line overlay */}
          <div
            className="absolute inset-0"
            style={{
              opacity: isDark ? 0.08 : 0.04,
              backgroundImage:
                'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(148,163,184,0.15) 2px, rgba(148,163,184,0.15) 4px)',
              backgroundSize: '100% 4px',
            }}
          />
          {/* Grid pattern */}
          <div
            className="absolute inset-0"
            style={{
              opacity: isDark ? 0.22 : 0.12,
              backgroundImage:
                'linear-gradient(rgba(148,163,184,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.1) 1px, transparent 1px)',
              backgroundSize: '80px 80px',
            }}
          />
        </div>

        <TopologyControls
          viewMode={viewMode}
          onViewModeChange={onViewModeChange}
          isLocked={isLocked}
          onLockToggle={onLockToggle}
          mappingDesign={mappingDesign}
          onDesignChange={onDesignChange}
          isAutoPlay={isAutoPlay}
          onAutoPlayToggle={onAutoPlayToggle}
          onGenerateReport={onGenerateReport}
          isGeneratingReport={isGeneratingReport}
        />

        {assistantOverlay}

        <div ref={containerRef} className="absolute inset-0">
          {dimensions.width > 0 && dimensions.height > 0 ? (
            <ForceGraph3D<Topology3DNode, Topology3DLink>
              ref={graphRef}
              graphData={graphData}
              width={dimensions.width}
              height={dimensions.height}
              backgroundColor={threeBackground}
              rendererConfig={{ antialias: true, alpha: false }}
              showNavInfo={false}
              nodeThreeObject={nodeThreeObject}
              nodeThreeObjectExtend={false}
              nodeColor={(node) => node.color}
              nodeVal={(node) => node.val}
              nodeOpacity={0}
              nodeResolution={16}
              nodeRelSize={3.6}
              nodeLabel={(node) =>
                `${node.label}\n${node.deviceType} • Risk ${node.riskScore}\n${node.responseTime !== null
                  ? `Latency ${node.responseTime.toFixed(1)}ms`
                  : 'Offline device'
                }`
              }
              linkColor={() => '#10B981'}
              linkWidth={(link) => Math.max(0.2, link.width * 0.25)}
              linkOpacity={isDark ? 0.56 : 0.48}
              linkCurvature={(link) => link.curvature}
              linkDirectionalArrowLength={(link) => 0.8 + link.width * 0.08}
              linkDirectionalArrowRelPos={0.9}
              linkDirectionalArrowColor={() => '#10B981'}
              linkDirectionalParticles={(link) => link.particles}
              linkDirectionalParticleWidth={(link) =>
                mappingDesign === 'cyber' ? 0.6 + link.width * 0.06 : 0.4 + link.width * 0.05
              }
              linkDirectionalParticleSpeed={(link) => link.speed}
              linkDirectionalParticleColor={() => '#10B981'}
              enableNavigationControls
              enableNodeDrag={!isLocked}
              onNodeClick={(node) => {
                onNodeSelect(String(node.id));
              }}
              cooldownTicks={150}
              warmupTicks={110}
              d3VelocityDecay={0.28}
            />
          ) : null}
        </div>
      </motion.div>
    </div>
  );
}
