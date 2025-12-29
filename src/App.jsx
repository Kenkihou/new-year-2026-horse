import React, { useEffect, useRef, useState, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF, Environment, ContactShadows, Grid } from "@react-three/drei";
import * as THREE from "three";

/**
 * 馬のモデル
 */
function HorseModel({ filename = "/horse.glb" }) {
  const { scene } = useGLTF(filename);
  useEffect(() => {
    scene.traverse((child) => {
      if (child.isMesh && child.material) {
        // 石膏のようなマットな質感
        child.material.roughness = 0.8;
        child.material.metalness = 0.0;
        child.material.envMapIntensity = 0.5;
        child.material.needsUpdate = true;
      }
    });
  }, [scene]);
  return <primitive object={scene} scale={6} position={[0, -1, -3]} rotation={[0, -Math.PI / 2, 0]} />;
}

/**
 * 壁面を流れるネオンテキスト（文字切れ修正版）
 */
function ScrollingNeonText() {
  const { gl } = useThree();
  
  // 末尾のスペースはそのままで
  const text = "A HAPPY NEW YEAR!     "; 

  // 壁の物理サイズ
  const wallW = 5;
  const wallH = 2.0;
  const totalW = wallW * 3;

  // 1. テクスチャ生成
  const neonTexture = useMemo(() => {
    const canvas = document.createElement("canvas");
    const width = 2048;
    const height = width / (totalW / wallH);
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 【修正】はみ出し防止のため、170px -> 150px に縮小
    // これで "A" の左端もキャンバス内に収まります
    ctx.font = "900 150px 'Arial Black', Arial, sans-serif";
    
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#ffffff";
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.repeat.set(1, 1);
    
    tex.anisotropy = gl.capabilities.getMaxAnisotropy();
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.needsUpdate = true;
    return tex;
  }, [text, totalW, wallH, gl]);

  // 2. マテリアル設定
  const materials = useMemo(() => {
    const mats = [];
    const initialOffsets = [2 / 3, 1 / 3, 0];

    for (let i = 0; i < 3; i++) {
      const clonedTex = neonTexture.clone();
      clonedTex.repeat.set(-1 / 3, 1);
      clonedTex.offset.set(initialOffsets[i], 0);
      clonedTex.needsUpdate = true;

      const mat = new THREE.MeshBasicMaterial({
        color: "#00ffff",
        alphaMap: clonedTex,
        alphaTest: 0.5,
        transparent: false,
        side: THREE.DoubleSide,
        map: null,
      });
      mats.push(mat);
    }
    return mats;
  }, [neonTexture]);

  // 3. アニメーション
  useFrame((state, delta) => {
    const speed = delta * 0.15;
    materials.forEach((mat) => {
      if (mat.alphaMap) {
        mat.alphaMap.offset.x += speed;
      }
    });
  });

  const d = 5;
  const offset = 0.05;

  return (
    <group position={[0, 2.0, -d / 2]}>
      {/* 右面 */}
      <mesh position={[wallW / 2 - offset, 0, 0]} rotation={[0, Math.PI / 2, 0]} material={materials[0]}>
        <planeGeometry args={[d, wallH]} />
      </mesh>
      {/* 奥面 */}
      <mesh position={[0, 0, -d / 2 + offset]} rotation={[0, Math.PI, 0]} material={materials[1]}>
        <planeGeometry args={[wallW, wallH]} />
      </mesh>
      {/* 左面 */}
      <mesh position={[-wallW / 2 + offset, 0, 0]} rotation={[0, -Math.PI / 2, 0]} material={materials[2]}>
        <planeGeometry args={[d, wallH]} />
      </mesh>
    </group>
  );
}

function AcrylicCase() {
  const aspect = 9 / 16;
  const width = 5;
  const height = width / aspect;
  const depth = 5;
  return (
    <group position={[0, 0, -depth / 2]}>
      <mesh>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial color="#050505" side={THREE.BackSide} roughness={0.5} />
      </mesh>
      <Grid position={[0, -height / 2 + 0.01, 0]} args={[width, depth]} cellColor="#333" sectionColor="#444" fadeDistance={10} />
    </group>
  );
}

function FrontGlass() {
  const aspect = 9 / 16;
  const width = 5;
  const height = width / aspect;
  return (
    <mesh position={[0, 0, 0.02]}>
      <planeGeometry args={[width, height]} />
      <meshPhysicalMaterial 
        transparent={true} 
        transmission={1} 
        roughness={0.02} // 画質優先でクッキリ
        metalness={0.0}
        ior={1.5} 
        thickness={0.1} 
        depthWrite={false}
        envMapIntensity={0.9}
      />
    </mesh>
  );
}

function WindowCamera({ isMobile, isGyroActive }) {
  const { camera, pointer } = useThree();
  const orientationRef = useRef(null);
  useEffect(() => {
    const handleOrientation = (event) => {
      let { beta, gamma } = event;
      if (beta === null || gamma === null) return;
      orientationRef.current = { beta, gamma };
    };
    if (isMobile && isGyroActive) window.addEventListener("deviceorientation", handleOrientation);
    return () => window.removeEventListener("deviceorientation", handleOrientation);
  }, [isMobile, isGyroActive]);

  useFrame(() => {
    const baseEyeZ = 12;
    let eyeX = 0, eyeY = 0, eyeZ = baseEyeZ;
    if (isMobile && isGyroActive && orientationRef.current) {
      const { beta, gamma } = orientationRef.current;
      eyeX = gamma * 0.3;
      eyeY = (beta - 90) * -0.3;
    } else {
      eyeX = pointer.x * 5;
      eyeY = pointer.y * 5;
    }
    camera.position.set(eyeX, eyeY, eyeZ);
    camera.quaternion.set(0, 0, 0, 1);
    const aspect = 9 / 16;
    const halfWidth = 2.5;
    const halfHeight = halfWidth / aspect;
    const near = 0.1;
    const far = 1000;
    const left = ((-halfWidth - eyeX) * near) / eyeZ;
    const right = ((halfWidth - eyeX) * near) / eyeZ;
    const top = ((halfHeight - eyeY) * near) / eyeZ;
    const bottom = ((-halfHeight - eyeY) * near) / eyeZ;
    camera.projectionMatrix.makePerspective(left, right, top, bottom, near, far);
  });
  return null;
}

export default function App() {
  const [hasPermission, setHasPermission] = useState(false);
  const [showOverlay, setShowOverlay] = useState(true);
  const [isMobile] = useState(() => window.innerWidth < 768);

  const handleStart = async () => {
    if (!isMobile) { setHasPermission(true); setShowOverlay(false); return; }
    if (typeof DeviceOrientationEvent !== "undefined" && typeof DeviceOrientationEvent.requestPermission === "function") {
      try {
        const permission = await DeviceOrientationEvent.requestPermission();
        if (permission === "granted") { setHasPermission(true); setShowOverlay(false); }
      } catch (e) { setShowOverlay(false); }
    } else { setHasPermission(true); setShowOverlay(false); }
  };

  return (
    <div style={{ width: "100vw", height: "100vh", background: "#000", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
      <div style={{ position: "relative", width: "100%", maxWidth: "50vh", aspectRatio: "9 / 16", maxHeight: "90vh", background: "#050505", overflow: "hidden", border: "1px solid #222" }}>
        <Canvas dpr={[1, 2]}>
          <ambientLight intensity={0.6} />
          <pointLight position={[0, 1, -2]} distance={10} intensity={15} color="#00ffff" />
          <Environment preset="warehouse" />

          <HorseModel />
          <AcrylicCase />
          <FrontGlass />
          <ScrollingNeonText />

          <ContactShadows position={[0, -4.98, -3]} opacity={0.6} scale={10} blur={2} resolution={256} frames={1} />
          <WindowCamera isMobile={isMobile} isGyroActive={hasPermission} />
        </Canvas>

        {showOverlay && (
          <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.9)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
            <h1 style={{ color: "white", marginBottom: "20px", fontFamily: "sans-serif", fontSize: "24px" }}>New Year 2026</h1>
            <button onClick={handleStart} style={{ padding: "12px 30px", fontSize: "16px", background: "white", border: "none", borderRadius: "30px", cursor: "pointer", fontWeight: "bold" }}>START</button>
          </div>
        )}
      </div>
    </div>
  );
}