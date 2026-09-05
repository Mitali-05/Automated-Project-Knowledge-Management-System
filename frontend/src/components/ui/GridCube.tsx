import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

interface GridCubeProps {
  className?: string;
}

export const GridCube: React.FC<GridCubeProps> = ({ className }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(3.5, 3, 3.5);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Create wireframe cube with grid subdivisions
    const cubeSize = 2;
    const divisions = 5;

    // Material for grid lines
    const lineMaterial = new THREE.LineBasicMaterial({
      color: new THREE.Color('#8b5cf6'),
      transparent: true,
      opacity: 0.7,
    });

    const glowMaterial = new THREE.LineBasicMaterial({
      color: new THREE.Color('#a78bfa'),
      transparent: true,
      opacity: 0.4,
    });

    const cubeGroup = new THREE.Group();

    // Helper to create a grid on a face
    const createFaceGrid = (
      axis1: 'x' | 'y' | 'z',
      axis2: 'x' | 'y' | 'z',
      fixedAxis: 'x' | 'y' | 'z',
      fixedValue: number
    ) => {
      const half = cubeSize / 2;
      const step = cubeSize / divisions;

      for (let i = 0; i <= divisions; i++) {
        const pos = -half + i * step;

        // Lines along axis1
        const points1: THREE.Vector3[] = [];
        const start1 = new THREE.Vector3();
        const end1 = new THREE.Vector3();
        start1[fixedAxis] = fixedValue;
        end1[fixedAxis] = fixedValue;
        start1[axis1] = pos;
        end1[axis1] = pos;
        start1[axis2] = -half;
        end1[axis2] = half;
        points1.push(start1, end1);
        const geom1 = new THREE.BufferGeometry().setFromPoints(points1);
        cubeGroup.add(new THREE.Line(geom1, i === 0 || i === divisions ? lineMaterial : glowMaterial));

        // Lines along axis2
        const points2: THREE.Vector3[] = [];
        const start2 = new THREE.Vector3();
        const end2 = new THREE.Vector3();
        start2[fixedAxis] = fixedValue;
        end2[fixedAxis] = fixedValue;
        start2[axis2] = pos;
        end2[axis2] = pos;
        start2[axis1] = -half;
        end2[axis1] = half;
        points2.push(start2, end2);
        const geom2 = new THREE.BufferGeometry().setFromPoints(points2);
        cubeGroup.add(new THREE.Line(geom2, i === 0 || i === divisions ? lineMaterial : glowMaterial));
      }
    };

    // Create grids on all 6 faces
    const half = cubeSize / 2;
    createFaceGrid('x', 'y', 'z', half);   // front
    createFaceGrid('x', 'y', 'z', -half);  // back
    createFaceGrid('x', 'z', 'y', half);   // top
    createFaceGrid('x', 'z', 'y', -half);  // bottom
    createFaceGrid('y', 'z', 'x', half);   // right
    createFaceGrid('y', 'z', 'x', -half);  // left

    // Add translucent faces for glow effect
    const faceMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#7c3aed'),
      transparent: true,
      opacity: 0.04,
      side: THREE.DoubleSide,
    });

    const faceGeometry = new THREE.PlaneGeometry(cubeSize, cubeSize);

    // Front face
    const frontFace = new THREE.Mesh(faceGeometry, faceMaterial);
    frontFace.position.z = half;
    cubeGroup.add(frontFace);

    // Back face
    const backFace = new THREE.Mesh(faceGeometry, faceMaterial);
    backFace.position.z = -half;
    cubeGroup.add(backFace);

    // Top face
    const topFace = new THREE.Mesh(faceGeometry, faceMaterial);
    topFace.rotation.x = Math.PI / 2;
    topFace.position.y = half;
    cubeGroup.add(topFace);

    // Bottom face
    const bottomFace = new THREE.Mesh(faceGeometry, faceMaterial);
    bottomFace.rotation.x = Math.PI / 2;
    bottomFace.position.y = -half;
    cubeGroup.add(bottomFace);

    // Right face
    const rightFace = new THREE.Mesh(faceGeometry, faceMaterial);
    rightFace.rotation.y = Math.PI / 2;
    rightFace.position.x = half;
    cubeGroup.add(rightFace);

    // Left face
    const leftFace = new THREE.Mesh(faceGeometry, faceMaterial);
    leftFace.rotation.y = Math.PI / 2;
    leftFace.position.x = -half;
    cubeGroup.add(leftFace);

    // Add point lights for glow
    const pointLight1 = new THREE.PointLight('#8b5cf6', 2, 10);
    pointLight1.position.set(2, 2, 2);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight('#6366f1', 1.5, 10);
    pointLight2.position.set(-2, -1, -2);
    scene.add(pointLight2);

    scene.add(cubeGroup);

    // Animation loop
    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      cubeGroup.rotation.x += 0.003;
      cubeGroup.rotation.y += 0.005;
      renderer.render(scene, camera);
    };
    animate();

    // Resize handler
    const handleResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ width: '100%', height: '100%' }}
    />
  );
};
