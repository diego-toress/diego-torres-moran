import { useState, useEffect, useRef } from "react";
import * as THREE from "three";

// ─── CUSTOM SHADERS ─────────────────────────────────────────────
const glowVertexShader = `
    varying vec3 vNormal;
    varying vec3 vPosition;
    uniform float uTime;

    void main() {
        vNormal = normalize(normalMatrix * normal);
        vPosition = position;

        // Morphing effect
        vec3 pos = position;
        float displacement = sin(pos.x * 3.0 + uTime) * sin(pos.y * 3.0 + uTime) * sin(pos.z * 3.0 + uTime) * 0.1;
        pos += normal * displacement;

        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
`;

const glowFragmentShader = `
    varying vec3 vNormal;
    varying vec3 vPosition;
    uniform float uTime;
    uniform vec3 uColor1;
    uniform vec3 uColor2;

    void main() {
        float intensity = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
        vec3 color = mix(uColor1, uColor2, sin(uTime * 0.5) * 0.5 + 0.5);
        gl_FragColor = vec4(color, 1.0) * intensity * 1.5;
    }
`;

const particleVertexShader = `
    attribute float aScale;
    attribute float aRandomness;
    uniform float uTime;
    uniform float uSize;
    uniform vec3 uColor1;
    uniform vec3 uColor2;
    varying vec3 vColor;

    void main() {
        vec4 modelPosition = modelMatrix * vec4(position, 1.0);

        // Spiral motion
        float angle = uTime * 0.2 + aRandomness * 6.28;
        float radius = length(modelPosition.xz);
        modelPosition.x = cos(angle + radius * 0.5) * radius;
        modelPosition.z = sin(angle + radius * 0.5) * radius;
        modelPosition.y += sin(uTime + aRandomness * 10.0) * 0.3;

        vec4 viewPosition = viewMatrix * modelPosition;
        gl_Position = projectionMatrix * viewPosition;
        gl_PointSize = uSize * aScale * (1.0 / -viewPosition.z);

        // Color based on position
        vColor = mix(uColor1, uColor2, modelPosition.y * 0.2 + 0.5);
    }
`;

const particleFragmentShader = `
    uniform float uAlpha;
    varying vec3 vColor;

    void main() {
        float dist = length(gl_PointCoord - vec2(0.5));
        if (dist > 0.5) discard;

        float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
        gl_FragColor = vec4(vColor, alpha * uAlpha);
    }
`;

const ringVertexShader = `
    uniform float uTime;
    varying vec2 vUv;
    varying float vElevation;

    void main() {
        vUv = uv;
        vec3 pos = position;

        // Wave effect on ring
        float wave = sin(pos.x * 10.0 + uTime * 2.0) * 0.05;
        wave += sin(pos.z * 10.0 + uTime * 2.0) * 0.05;
        pos.y += wave;
        vElevation = wave;

        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
`;

const ringFragmentShader = `
    uniform float uTime;
    uniform vec3 uColor;
    varying vec2 vUv;
    varying float vElevation;

    void main() {
        float alpha = sin(vUv.x * 50.0 + uTime * 3.0) * 0.3 + 0.5;
        alpha *= 0.6;
        vec3 color = uColor + vElevation * 2.0;
        gl_FragColor = vec4(color, alpha);
    }
`;

function ThreeScene({ theme = "dark" }) {
    const mountRef = useRef(null);

    useEffect(() => {
        if (!mountRef.current) return;
        const container = mountRef.current;
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 1000);
        camera.position.z = 6;
        camera.position.y = 1;

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setClearColor(0x000000, 0);
        container.appendChild(renderer.domElement);

        // Theme-based colors
        const isDark = theme === "dark";
        const colors = {
            primary: isDark ? 0x00f5d4 : 0x00a896,
            secondary: isDark ? 0xf72585 : 0xd90368,
            tertiary: isDark ? 0x7209b7 : 0x5a189a,
            accent: isDark ? 0x4cc9f0 : 0x0077b6,
        };

        // ─── LIGHTING ────────────────────────────────────────
        const ambientLight = new THREE.AmbientLight(isDark ? 0x404040 : 0x808080, isDark ? 0.3 : 0.6);
        scene.add(ambientLight);

        const pointLight1 = new THREE.PointLight(colors.primary, isDark ? 3 : 2, 20);
        pointLight1.position.set(3, 3, 3);
        scene.add(pointLight1);

        const pointLight2 = new THREE.PointLight(colors.secondary, isDark ? 2 : 1.5, 20);
        pointLight2.position.set(-3, -2, 2);
        scene.add(pointLight2);

        const pointLight3 = new THREE.PointLight(colors.tertiary, isDark ? 2 : 1.5, 20);
        pointLight3.position.set(0, 4, -3);
        scene.add(pointLight3);

        // ─── CENTRAL GLOWING SPHERE ──────────────────────────
        const centralGeometry = new THREE.IcosahedronGeometry(1.2, 4);
        const centralMaterial = new THREE.ShaderMaterial({
            vertexShader: glowVertexShader,
            fragmentShader: glowFragmentShader,
            uniforms: {
                uTime: { value: 0 },
                uColor1: { value: new THREE.Color(colors.primary) },
                uColor2: { value: new THREE.Color(colors.tertiary) },
            },
            transparent: true,
            side: THREE.DoubleSide,
            blending: isDark ? THREE.AdditiveBlending : THREE.NormalBlending,
        });
        const centralSphere = new THREE.Mesh(centralGeometry, centralMaterial);
        scene.add(centralSphere);

        // Inner core
        const coreGeometry = new THREE.IcosahedronGeometry(0.6, 2);
        const coreMaterial = new THREE.MeshStandardMaterial({
            color: colors.primary,
            emissive: colors.primary,
            emissiveIntensity: isDark ? 0.5 : 0.3,
            wireframe: true,
            transparent: true,
            opacity: isDark ? 0.8 : 0.9,
        });
        const core = new THREE.Mesh(coreGeometry, coreMaterial);
        scene.add(core);

        // ─── ORBITAL RINGS ───────────────────────────────────
        const rings = [];
        const ringConfigs = [
            { radius: 2.2, color: colors.primary, rotation: { x: Math.PI / 6, y: 0 } },
            { radius: 2.8, color: colors.secondary, rotation: { x: -Math.PI / 4, y: Math.PI / 3 } },
            { radius: 3.4, color: colors.tertiary, rotation: { x: Math.PI / 3, y: -Math.PI / 4 } },
        ];

        ringConfigs.forEach((config) => {
            const ringGeometry = new THREE.TorusGeometry(config.radius, isDark ? 0.02 : 0.03, 16, 100);
            const ringMaterial = new THREE.ShaderMaterial({
                vertexShader: ringVertexShader,
                fragmentShader: ringFragmentShader,
                uniforms: {
                    uTime: { value: 0 },
                    uColor: { value: new THREE.Color(config.color) },
                },
                transparent: true,
                side: THREE.DoubleSide,
            });
            const ring = new THREE.Mesh(ringGeometry, ringMaterial);
            ring.rotation.x = config.rotation.x;
            ring.rotation.y = config.rotation.y;
            scene.add(ring);
            rings.push({ mesh: ring, material: ringMaterial, baseRotation: { ...config.rotation } });
        });

        // ─── ORBITING NODES ──────────────────────────────────
        const nodes = [];
        const nodeColors = [colors.primary, colors.secondary, colors.tertiary, colors.accent];
        const nodeCount = 12;
        for (let i = 0; i < nodeCount; i++) {
            const angle = (i / nodeCount) * Math.PI * 2;
            const radius = 2 + Math.random() * 1.5;
            const yOffset = (Math.random() - 0.5) * 2;

            const nodeGeometry = new THREE.OctahedronGeometry(0.08 + Math.random() * 0.08, 0);
            const nodeMaterial = new THREE.MeshStandardMaterial({
                color: nodeColors[i % 4],
                emissive: nodeColors[i % 4],
                emissiveIntensity: isDark ? 0.8 : 0.4,
                metalness: 0.8,
                roughness: 0.2,
            });
            const node = new THREE.Mesh(nodeGeometry, nodeMaterial);
            node.position.set(
                Math.cos(angle) * radius,
                yOffset,
                Math.sin(angle) * radius
            );
            scene.add(node);
            nodes.push({
                mesh: node,
                angle,
                radius,
                yOffset,
                speed: 0.2 + Math.random() * 0.3,
                ySpeed: 0.5 + Math.random() * 0.5,
            });
        }

        // ─── CONNECTION LINES (NEURAL NETWORK EFFECT) ────────
        const lineMaterial = new THREE.LineBasicMaterial({
            color: colors.primary,
            transparent: true,
            opacity: isDark ? 0.15 : 0.25,
        });
        const connectionLines = [];

        const updateConnections = () => {
            connectionLines.forEach((line) => scene.remove(line));
            connectionLines.length = 0;

            nodes.forEach((node1, i) => {
                nodes.forEach((node2, j) => {
                    if (i >= j) return;
                    const dist = node1.mesh.position.distanceTo(node2.mesh.position);
                    if (dist < 3) {
                        const geometry = new THREE.BufferGeometry().setFromPoints([
                            node1.mesh.position,
                            node2.mesh.position,
                        ]);
                        const line = new THREE.Line(geometry, lineMaterial.clone());
                        line.material.opacity = 0.15 * (1 - dist / 3);
                        scene.add(line);
                        connectionLines.push(line);
                    }
                });
            });
        };

        // ─── PARTICLE SYSTEM ─────────────────────────────────
        const particleCount = isDark ? 500 : 300;
        const particleGeometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const scales = new Float32Array(particleCount);
        const randomness = new Float32Array(particleCount);

        for (let i = 0; i < particleCount; i++) {
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            const radius = 3 + Math.random() * 4;

            positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
            positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
            positions[i * 3 + 2] = radius * Math.cos(phi);
            scales[i] = Math.random();
            randomness[i] = Math.random();
        }

        particleGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        particleGeometry.setAttribute("aScale", new THREE.BufferAttribute(scales, 1));
        particleGeometry.setAttribute("aRandomness", new THREE.BufferAttribute(randomness, 1));

        const particleMaterial = new THREE.ShaderMaterial({
            vertexShader: particleVertexShader,
            fragmentShader: particleFragmentShader,
            uniforms: {
                uTime: { value: 0 },
                uSize: { value: (isDark ? 30 : 40) * renderer.getPixelRatio() },
                uColor1: { value: new THREE.Color(colors.primary) },
                uColor2: { value: new THREE.Color(colors.tertiary) },
                uAlpha: { value: isDark ? 0.8 : 0.6 },
            },
            transparent: true,
            depthWrite: false,
            blending: isDark ? THREE.AdditiveBlending : THREE.NormalBlending,
        });

        const particles = new THREE.Points(particleGeometry, particleMaterial);
        scene.add(particles);

        // ─── FLOATING GEOMETRIC SHAPES ───────────────────────
        const floatingShapes = [];
        const shapeColors = [colors.primary, colors.secondary, colors.tertiary];
        const shapeConfigs = [
            { geometry: new THREE.TetrahedronGeometry(0.3, 0), pos: [-4, 2, -2] },
            { geometry: new THREE.OctahedronGeometry(0.25, 0), pos: [4, -1.5, -1] },
            { geometry: new THREE.IcosahedronGeometry(0.2, 0), pos: [-3, -2, 1] },
            { geometry: new THREE.TorusKnotGeometry(0.2, 0.06, 64, 8), pos: [3.5, 2.5, -2] },
            { geometry: new THREE.DodecahedronGeometry(0.22, 0), pos: [-4.5, 0, -1] },
            { geometry: new THREE.ConeGeometry(0.2, 0.4, 4), pos: [4.5, 1, -1.5] },
        ];

        shapeConfigs.forEach((config, i) => {
            const material = new THREE.MeshStandardMaterial({
                color: shapeColors[i % 3],
                emissive: shapeColors[i % 3],
                emissiveIntensity: isDark ? 0.3 : 0.15,
                metalness: 0.9,
                roughness: 0.1,
                wireframe: Math.random() > 0.5,
            });
            const mesh = new THREE.Mesh(config.geometry, material);
            mesh.position.set(...config.pos);
            scene.add(mesh);
            floatingShapes.push({
                mesh,
                initialPos: [...config.pos],
                rotSpeed: { x: 0.01 + Math.random() * 0.02, y: 0.01 + Math.random() * 0.02 },
                floatSpeed: 0.5 + Math.random() * 0.5,
                floatAmp: 0.3 + Math.random() * 0.3,
            });
        });

        // ─── MOUSE INTERACTION ───────────────────────────────
        let mouseX = 0, mouseY = 0;
        let targetMouseX = 0, targetMouseY = 0;

        const handleMouseMove = (e) => {
            targetMouseX = (e.clientX / window.innerWidth) * 2 - 1;
            targetMouseY = -(e.clientY / window.innerHeight) * 2 + 1;
        };
        window.addEventListener("mousemove", handleMouseMove);

        // ─── ANIMATION LOOP ──────────────────────────────────
        let animId;
        const clock = new THREE.Clock();

        const animate = () => {
            animId = requestAnimationFrame(animate);
            const elapsed = clock.getElapsedTime();

            // Smooth mouse interpolation
            mouseX += (targetMouseX - mouseX) * 0.05;
            mouseY += (targetMouseY - mouseY) * 0.05;

            // Update central sphere
            centralMaterial.uniforms.uTime.value = elapsed;
            centralSphere.rotation.y = elapsed * 0.1;
            centralSphere.rotation.x = elapsed * 0.05;

            // Update core
            core.rotation.y = -elapsed * 0.3;
            core.rotation.x = elapsed * 0.2;

            // Update rings
            rings.forEach((ring, i) => {
                ring.material.uniforms.uTime.value = elapsed;
                ring.mesh.rotation.z = elapsed * 0.1 * (i % 2 === 0 ? 1 : -1);
            });

            // Update orbiting nodes
            nodes.forEach((node) => {
                node.angle += node.speed * 0.01;
                node.mesh.position.x = Math.cos(node.angle) * node.radius;
                node.mesh.position.z = Math.sin(node.angle) * node.radius;
                node.mesh.position.y = node.yOffset + Math.sin(elapsed * node.ySpeed) * 0.5;
                node.mesh.rotation.x += 0.02;
                node.mesh.rotation.y += 0.03;
            });

            // Update connections
            if (Math.floor(elapsed * 10) % 3 === 0) {
                updateConnections();
            }

            // Update particles
            particleMaterial.uniforms.uTime.value = elapsed;

            // Update floating shapes
            floatingShapes.forEach((shape) => {
                shape.mesh.rotation.x += shape.rotSpeed.x;
                shape.mesh.rotation.y += shape.rotSpeed.y;
                shape.mesh.position.y = shape.initialPos[1] + Math.sin(elapsed * shape.floatSpeed) * shape.floatAmp;
            });

            // Update lights
            pointLight1.position.x = Math.sin(elapsed * 0.5) * 4;
            pointLight1.position.z = Math.cos(elapsed * 0.5) * 4;
            pointLight2.position.x = Math.cos(elapsed * 0.3) * 3;
            pointLight2.position.z = Math.sin(elapsed * 0.3) * 3;

            // Camera movement based on mouse
            camera.position.x += (mouseX * 2 - camera.position.x) * 0.02;
            camera.position.y += (mouseY * 1.5 + 1 - camera.position.y) * 0.02;
            camera.lookAt(0, 0, 0);

            renderer.render(scene, camera);
        };
        animate();

        // ─── RESIZE HANDLER ──────────────────────────────────
        const handleResize = () => {
            camera.aspect = container.clientWidth / container.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(container.clientWidth, container.clientHeight);
            particleMaterial.uniforms.uSize.value = (isDark ? 30 : 40) * renderer.getPixelRatio();
        };
        window.addEventListener("resize", handleResize);

        // ─── CLEANUP ─────────────────────────────────────────
        return () => {
            cancelAnimationFrame(animId);
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("resize", handleResize);
            connectionLines.forEach((line) => {
                line.geometry.dispose();
                line.material.dispose();
            });
            if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
            renderer.dispose();
        };
    }, [theme]);

    return <div ref={mountRef} style={{ position: "absolute", inset: 0, zIndex: 0 }} />;
}

// ─── HOOKS ───────────────────────────────────────────────────────
function useReveal(threshold = 0.15) {
    const ref = useRef(null);
    const [visible, setVisible] = useState(false);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold });
        obs.observe(el);
        return () => obs.disconnect();
    }, [threshold]);
    return [ref, visible];
}

function RevealSection({ children, className = "", delay = 0 }) {
    const [ref, visible] = useReveal();
    return (
        <div ref={ref} className={className} style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(40px)",
            transition: `opacity 0.8s cubic-bezier(.16,1,.3,1) ${delay}s, transform 0.8s cubic-bezier(.16,1,.3,1) ${delay}s`,
        }}>{children}</div>
    );
}

// ─── THEME DEFINITIONS ───────────────────────────────────────────
const themes = {
    dark: {
        bg: "#080812",
        bgSecondary: "rgba(8,8,18,0.85)",
        bgCard: "rgba(255,255,255,0.02)",
        bgCardHover: "rgba(255,255,255,0.04)",
        bgInput: "rgba(255,255,255,0.03)",
        text: "#fff",
        textSecondary: "rgba(255,255,255,0.5)",
        textMuted: "rgba(255,255,255,0.4)",
        textSubtle: "rgba(255,255,255,0.3)",
        border: "rgba(255,255,255,0.06)",
        borderHover: "rgba(255,255,255,0.1)",
        accent: "#00f5d4",
        gradientOverlay: "linear-gradient(transparent, #080812)",
        scrollbarTrack: "#080812",
        scrollbarThumb: "#00f5d433",
        selection: "#00f5d433",
        mobileMenu: "rgba(8,8,18,0.95)",
    },
    light: {
        bg: "#f8f9fc",
        bgSecondary: "rgba(255,255,255,0.9)",
        bgCard: "rgba(0,0,0,0.02)",
        bgCardHover: "rgba(0,0,0,0.05)",
        bgInput: "rgba(0,0,0,0.03)",
        text: "#1a1a2e",
        textSecondary: "rgba(26,26,46,0.6)",
        textMuted: "rgba(26,26,46,0.5)",
        textSubtle: "rgba(26,26,46,0.35)",
        border: "rgba(0,0,0,0.08)",
        borderHover: "rgba(0,0,0,0.15)",
        accent: "#00c9a7",
        gradientOverlay: "linear-gradient(transparent, #f8f9fc)",
        scrollbarTrack: "#f8f9fc",
        scrollbarThumb: "#00c9a744",
        selection: "#00c9a733",
        mobileMenu: "rgba(255,255,255,0.95)",
    },
};

// ─── NAVBAR ──────────────────────────────────────────────────────
function Navbar({ activeSection, theme, toggleTheme, t }) {
    const [scrolled, setScrolled] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 60);
        window.addEventListener("scroll", onScroll);
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    const links = ["Home", "About", "Skills", "Experience", "Projects", "Contact"];
    const scrollTo = (id) => {
        setMenuOpen(false);
        document.getElementById(id.toLowerCase())?.scrollIntoView({ behavior: "smooth" });
    };

    return (
        <nav style={{
            position: "fixed", top: 0, left: 0, right: 0, zIndex: 1000,
            padding: scrolled ? "12px 40px" : "20px 40px",
            background: scrolled ? t.bgSecondary : "transparent",
            backdropFilter: scrolled ? "blur(20px) saturate(180%)" : "none",
            borderBottom: scrolled ? `1px solid ${t.border}` : "none",
            transition: "all 0.4s cubic-bezier(.16,1,.3,1)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 800, letterSpacing: -1, color: t.accent, cursor: "pointer" }} onClick={() => scrollTo("Home")}>
                DT<span style={{ color: t.textSubtle }}>.</span>
            </div>
            <div style={{ display: "flex", gap: 28, alignItems: "center" }} className="nav-desktop">
                {links.map((l) => (
                    <button key={l} onClick={() => scrollTo(l)} style={{
                        background: "none", border: "none", cursor: "pointer",
                        fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 500,
                        letterSpacing: 1.5, textTransform: "uppercase",
                        color: activeSection === l.toLowerCase() ? t.accent : t.textSecondary,
                        transition: "color 0.3s", position: "relative", padding: "4px 0",
                    }}>
                        {l}
                        {activeSection === l.toLowerCase() && <span style={{ position: "absolute", bottom: -2, left: 0, right: 0, height: 2, background: t.accent, borderRadius: 1 }} />}
                    </button>
                ))}
                <button onClick={toggleTheme} style={{
                    background: t.bgCard, border: `1px solid ${t.border}`,
                    borderRadius: 50, padding: "8px 12px", cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 6,
                    transition: "all 0.3s",
                }} title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}>
                    <span style={{ fontSize: 14 }}>{theme === "dark" ? "☀️" : "🌙"}</span>
                </button>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }} className="nav-mobile-controls">
                <button onClick={toggleTheme} className="nav-mobile-theme" style={{
                    display: "none", background: t.bgCard, border: `1px solid ${t.border}`,
                    borderRadius: 50, padding: "8px 12px", cursor: "pointer",
                }}>
                    <span style={{ fontSize: 14 }}>{theme === "dark" ? "☀️" : "🌙"}</span>
                </button>
                <button onClick={() => setMenuOpen(!menuOpen)} className="nav-mobile-toggle" style={{ display: "none", background: "none", border: "none", cursor: "pointer", padding: 8 }}>
                    <div style={{ width: 24, height: 2, background: t.accent, marginBottom: 5, transition: "all 0.3s", transform: menuOpen ? "rotate(45deg) translate(5px,5px)" : "none" }} />
                    <div style={{ width: 24, height: 2, background: t.accent, marginBottom: 5, transition: "all 0.3s", opacity: menuOpen ? 0 : 1 }} />
                    <div style={{ width: 24, height: 2, background: t.accent, transition: "all 0.3s", transform: menuOpen ? "rotate(-45deg) translate(5px,-5px)" : "none" }} />
                </button>
            </div>
            {menuOpen && (
                <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: t.mobileMenu, backdropFilter: "blur(20px)", padding: "20px 40px", display: "flex", flexDirection: "column", gap: 16, borderBottom: `1px solid ${t.border}` }}>
                    {links.map((l) => (
                        <button key={l} onClick={() => scrollTo(l)} style={{ background: "none", border: "none", cursor: "pointer", textAlign: "left", fontFamily: "'DM Sans', sans-serif", fontSize: 15, fontWeight: 500, color: activeSection === l.toLowerCase() ? t.accent : t.textSecondary }}>{l}</button>
                    ))}
                </div>
            )}
        </nav>
    );
}

// ─── STAT COUNTER ───────────────────────────────────────────────
function StatCounter({ value, label, suffix = "", prefix = "", t }) {
    const [count, setCount] = useState(0);
    const [ref, visible] = useReveal();
    useEffect(() => {
        if (!visible) return;
        let start = 0;
        const step = Math.max(1, Math.ceil(value / 40));
        const timer = setInterval(() => {
            start += step;
            if (start >= value) { setCount(value); clearInterval(timer); }
            else setCount(start);
        }, 30);
        return () => clearInterval(timer);
    }, [visible, value]);
    return (
        <div ref={ref} style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 48, fontWeight: 800, color: t.accent, lineHeight: 1 }}>
                {prefix}{count}{suffix}
            </div>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: t.textMuted, marginTop: 8, letterSpacing: 1, textTransform: "uppercase" }}>{label}</div>
        </div>
    );
}

// ─── SKILL CARD ─────────────────────────────────────────────────
function SkillCard({ icon, title, items, color, delay, t }) {
    const [hovered, setHovered] = useState(false);
    return (
        <RevealSection delay={delay}>
            <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} style={{
                background: hovered ? t.bgCardHover : t.bgCard,
                border: `1px solid ${hovered ? color + "44" : t.border}`,
                borderRadius: 20, padding: "36px 32px",
                transition: "all 0.5s cubic-bezier(.16,1,.3,1)",
                transform: hovered ? "translateY(-6px)" : "none",
                boxShadow: hovered ? `0 20px 60px ${color}15` : "none", cursor: "default",
            }}>
                <div style={{
                    width: 52, height: 52, borderRadius: 14,
                    background: `linear-gradient(135deg, ${color}22, ${color}08)`,
                    border: `1px solid ${color}33`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 24, marginBottom: 20,
                }}>{icon}</div>
                <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 700, color: t.text, marginBottom: 14 }}>{title}</h3>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {items.map((item) => (
                        <span key={item} style={{
                            padding: "6px 14px", borderRadius: 50, fontSize: 12,
                            fontFamily: "'DM Sans', sans-serif", fontWeight: 500,
                            background: `${color}12`, border: `1px solid ${color}25`, color,
                            letterSpacing: 0.3,
                        }}>{item}</span>
                    ))}
                </div>
            </div>
        </RevealSection>
    );
}

// ─── EXPERIENCE CARD ────────────────────────────────────────────
function ExperienceCard({ company, role, period, highlights, isLast, delay, t }) {
    const [hovered, setHovered] = useState(false);
    return (
        <RevealSection delay={delay}>
            <div style={{ display: "flex", gap: 28 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 20 }}>
                    <div style={{
                        width: 14, height: 14, borderRadius: "50%",
                        background: hovered ? t.accent : "transparent",
                        border: `2px solid ${hovered ? t.accent : t.accent + "66"}`,
                        transition: "all 0.4s", flexShrink: 0,
                        boxShadow: hovered ? `0 0 16px ${t.accent}66` : "none",
                    }} />
                    {!isLast && <div style={{ width: 1, flex: 1, background: t.accent + "22", marginTop: 8 }} />}
                </div>
                <div
                    onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
                    style={{
                        flex: 1, paddingBottom: isLast ? 0 : 48,
                        background: hovered ? t.bgCard : "transparent",
                        borderRadius: 16, padding: "24px 28px", marginTop: -10,
                        border: `1px solid ${hovered ? t.accent + "22" : "transparent"}`,
                        transition: "all 0.4s cubic-bezier(.16,1,.3,1)",
                    }}
                >
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: t.accent, letterSpacing: 1.5 }}>{period}</span>
                    <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 700, color: t.text, marginTop: 8, marginBottom: 4 }}>{role}</h3>
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: t.textMuted, marginBottom: 16 }}>{company}</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {highlights.map((h, i) => (
                            <span key={i} style={{
                                padding: "6px 14px", borderRadius: 8, fontSize: 12,
                                fontFamily: "'DM Sans', sans-serif", fontWeight: 500,
                                background: t.accent + "11", border: `1px solid ${t.accent}22`,
                                color: t.textSecondary, lineHeight: 1.4,
                            }}>{h}</span>
                        ))}
                    </div>
                </div>
            </div>
        </RevealSection>
    );
}

// ─── PROJECT CARD ───────────────────────────────────────────────
function ProjectCard({ title, description, tags, gradient, metrics, delay, t, theme }) {
    const [hovered, setHovered] = useState(false);
    return (
        <RevealSection delay={delay}>
            <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} style={{
                borderRadius: 20, overflow: "hidden",
                border: `1px solid ${t.border}`,
                transition: "all 0.5s cubic-bezier(.16,1,.3,1)",
                transform: hovered ? "translateY(-8px)" : "none",
                boxShadow: hovered ? `0 30px 80px ${theme === "dark" ? "rgba(0,0,0,0.4)" : "rgba(0,0,0,0.15)"}` : "none", cursor: "pointer",
            }}>
                <div style={{
                    height: 200, background: gradient,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    position: "relative", overflow: "hidden",
                }}>
                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center", padding: "0 20px" }}>
                        {metrics.map((m, i) => (
                            <div key={i} style={{
                                padding: "10px 18px", borderRadius: 12,
                                backdropFilter: "blur(12px)", background: "rgba(0,0,0,0.3)",
                                border: "1px solid rgba(255,255,255,0.1)",
                                transition: "all 0.5s", transform: hovered ? "translateY(-4px)" : "none",
                                transitionDelay: `${i * 0.05}s`,
                            }}>
                                <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 800, color: "#00f5d4" }}>{m.value}</div>
                                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: "rgba(255,255,255,0.5)", letterSpacing: 0.5, marginTop: 2 }}>{m.label}</div>
                            </div>
                        ))}
                    </div>
                    <div style={{ position: "absolute", inset: 0, opacity: 0.06, backgroundImage: "linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
                </div>
                <div style={{ padding: "28px 28px 32px", background: theme === "dark" ? "rgba(12,12,24,0.8)" : "rgba(255,255,255,0.9)" }}>
                    <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 700, color: t.text, marginBottom: 10 }}>{title}</h3>
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: t.textSecondary, lineHeight: 1.6, marginBottom: 18 }}>{description}</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {tags.map((tag) => (
                            <span key={tag} style={{
                                padding: "5px 12px", borderRadius: 50, fontSize: 11,
                                fontFamily: "'JetBrains Mono', monospace", fontWeight: 500,
                                background: t.bgCard, border: `1px solid ${t.border}`, color: t.textSecondary,
                            }}>{tag}</span>
                        ))}
                    </div>
                </div>
            </div>
        </RevealSection>
    );
}

// ─── MAIN APP ───────────────────────────────────────────────────
export default function Portfolio() {
    const [activeSection, setActiveSection] = useState("home");
    const [formData, setFormData] = useState({ name: "", email: "", message: "" });
    const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
    const [theme, setTheme] = useState("dark");

    const t = themes[theme];
    const toggleTheme = () => {
        const newTheme = theme === "dark" ? "light" : "dark";
        setTheme(newTheme);
        if (typeof window !== "undefined") {
            localStorage.setItem("portfolio-theme", newTheme);
        }
    };


    useEffect(() => {
        const sections = ["home", "about", "skills", "experience", "projects", "contact"];
        const obs = new IntersectionObserver(
            (entries) => { entries.forEach((e) => { if (e.isIntersecting && e.intersectionRatio > 0.3) setActiveSection(e.target.id); }); },
            { threshold: 0.3 }
        );
        sections.forEach((id) => { const el = document.getElementById(id); if (el) obs.observe(el); });
        return () => obs.disconnect();
    }, []);

    useEffect(() => {
        const handler = (e) => setCursorPos({ x: e.clientX, y: e.clientY });
        window.addEventListener("mousemove", handler);
        return () => window.removeEventListener("mousemove", handler);
    }, []);

    const [formStatus, setFormStatus] = useState("idle"); // idle | sending | success | error

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name || !formData.email || !formData.message) {
            alert("Please fill in all fields.");
            return;
        }
        setFormStatus("sending");
        try {
            const res = await fetch("https://api.web3forms.com/submit", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    access_key: "e2afb174-0e7e-458d-aa67-dc7d720a1bcd", // Get free key at https://web3forms.com
                    name: formData.name,
                    email: formData.email,
                    message: formData.message,
                    subject: `Portfolio Contact from ${formData.name}`,
                    from_name: "Portfolio Website",
                }),
            });
            const data = await res.json();
            if (data.success) {
                setFormStatus("success");
                setFormData({ name: "", email: "", message: "" });
                setTimeout(() => setFormStatus("idle"), 5000);
            } else {
                setFormStatus("error");
                setTimeout(() => setFormStatus("idle"), 4000);
            }
        } catch (err) {
            setFormStatus("error");
            setTimeout(() => setFormStatus("idle"), 4000);
        }
    };

    const skills = [
        { icon: "◆", title: "Frontend Frameworks", items: ["React", "Next.js", "Vue 3", "Nuxt.js", "Angular", "Svelte", "SvelteKit", "React Native", "Expo", "Gatsby"], color: "#00f5d4" },
        { icon: "◈", title: "State & Architecture", items: ["Redux", "Zustand", "Pinia", "NgRx", "MobX", "React Query", "Context API", "Vuex", "RxJS", "Signals"], color: "#ff6b6b" },
        { icon: "◇", title: "3D, Graphics & Data Viz", items: ["Three.js", "React Three Fiber", "D3.js", "Chart.js", "WebGL", "GSAP", "Lottie", "Canvas API", "Recharts"], color: "#7209b7" },
        { icon: "✦", title: "Styling & UI Systems", items: ["Tailwind CSS", "Bootstrap", "MUI", "Sass/SCSS", "CSS Modules", "Storybook", "Radix UI", "Framer Motion"], color: "#f72585" },
        { icon: "⬡", title: "Languages", items: ["JavaScript", "TypeScript", "Python", "HTML5", "CSS3", "SQL", "GraphQL", "Bash", "Markdown", "JSON/YAML"], color: "#4cc9f0" },
        { icon: "◈", title: "Backend & APIs", items: ["Node.js", "Nest.js", "Express", "Django", "Flask", "FastAPI", "REST APIs", "GraphQL", "WebSockets"], color: "#f4a261" },
        { icon: "⬢", title: "Databases & BaaS", items: ["PostgreSQL", "MongoDB", "MySQL", "Redis", "Firebase", "Supabase", "Prisma", "Mongoose", "TypeORM"], color: "#06d6a0" },
        { icon: "◎", title: "Cloud & Infrastructure", items: ["AWS", "GCP", "Azure", "Docker", "Vercel", "Netlify", "Lambda", "Cloud Functions", "S3", "CloudFront"], color: "#a78bfa" },
        { icon: "⊡", title: "DevOps & Testing", items: ["Git", "GitHub Actions", "CI/CD", "Jest", "Cypress", "Vitest", "Playwright", "Webpack", "Vite", "Turborepo"], color: "#fbbf24" },
        { icon: "⬣", title: "Tools & Workflow", items: ["Figma", "ClickUp", "Monday.com", "Trello", "Jira", "Agile/Scrum", "Postman", "Docker Compose", "Prettier"], color: "#34d399" },
    ];

    const experience = [
        {
            company: "Business Brokerage Services, LLC",
            role: "Full Stack Engineer — Team Leader",
            period: "MAR 2022 — JUN 2025",
            highlights: [
                "Led & mentored a cross-functional team of 5 engineers across frontend, backend & DevOps",
                "Architected and shipped a business listing portal from zero to production in under 8 weeks",
                "Slashed page load time from 5s → under 1s via code splitting, lazy loading & CDN optimization",
                "Designed and launched a role-based admin dashboard with granular access control in 3 weeks",
                "Integrated Stripe payment processing & DocuSign e-signature APIs for end-to-end deal flow",
                "Established CI/CD pipelines with GitHub Actions — automated testing, linting & zero-downtime deploys",
                "Improved overall dev velocity by 22% through sprint planning, code reviews & Agile best practices",
                "Reduced tech debt by 25%+ via strategic refactoring, modular architecture & shared component library",
                "Managed stakeholder communication, sprint demos & cross-team alignment across product & engineering",
                "Championed TypeScript adoption and enforced coding standards that reduced production bugs by 40%",
            ],
        },
        {
            company: "Beagle",
            role: "Frontend Engineer — Web & Mobile",
            period: "AUG 2020 — JAN 2022",
            highlights: [
                "Owned end-to-end UI development for a mobile-first fintech app serving thousands of active users",
                "Built the web platform first using React & Next.js with SSR, then developed the internal mobile app",
                "Delivered pixel-perfect implementations from Figma designs in React Native & Flutter",
                "Engineered a scalable, reusable design system with Tailwind CSS — 50+ shared components",
                "Decreased user bounce rate by 24% through UX improvements, faster rendering & A/B testing",
                "Reduced mobile bundle size by 20% via tree shaking, dynamic imports & asset optimization",
                "Integrated Firebase Authentication, Cloud Messaging & push notification infrastructure",
                "Improved onboarding UX flow — increased new user completion rate significantly",
                "Collaborated closely with product, design & QA teams in a fast-paced Agile environment",
                "Wrote comprehensive unit & integration tests to ensure cross-platform reliability",
            ],
        },
        {
            company: "Investi",
            role: "Full Stack Developer",
            period: "FEB 2019 — AUG 2020",
            highlights: [
                "Developed a full legal case tracking web application from the ground up — frontend to deployment",
                "Built scalable REST APIs with Node.js & Python powering dynamic dashboards and reporting tools",
                "Increased test coverage from 20% → 80% with Jest & integration tests, reducing regressions",
                "Automated data entry pipelines that saved 50+ hours per month in manual processing",
                "Engineered multi-tenant access control supporting 300+ concurrent users with role-based permissions",
                "Shipped new features every 2 weeks following Agile sprints with stakeholder sign-off",
                "Reduced support tickets by 35% through proactive UX fixes and error handling improvements",
                "Designed and normalized database schemas in MongoDB for high-throughput query performance",
                "Enabled real-time data updates using WebSockets for live case status tracking",
                "Documented APIs and onboarded junior developers — improving team ramp-up time by 50%",
            ],
        },
        {
            company: "Medtronic",
            role: "Full Stack Developer",
            period: "OCT 2017 — JAN 2019",
            highlights: [
                "Contributed to a mission-critical internal analytics dashboard used daily by healthcare teams",
                "Built complex, data-heavy visualizations with D3.js & Chart.js — interactive charts, heatmaps & graphs",
                "Connected React frontend to Python-based REST APIs for real-time data ingestion & display",
                "Designed and implemented a HIPAA-compliant user permission layer with audit trail logging",
                "Automated reporting workflows for 5 departments — eliminating hours of manual report generation",
                "Reduced API response time by 38% through query optimization, indexing & caching strategies",
                "Collaborated with QA to implement automated testing — reduced production bugs by 30%",
                "Worked within strict healthcare compliance standards ensuring data security & patient privacy",
                "Participated in code reviews, technical planning & cross-team architecture discussions",
                "Delivered production-ready features on tight deadlines within a regulated enterprise environment",
            ],
        },
    ];

    const projects = [
        {
            title: "Move Together — Fitness App",
            description: "Full-stack fitness app with native HealthKit & Google Fit integration for real-time step tracking, gamification with points and leaderboards, gift card rewards via Runa, RevenueCat subscriptions, and custom native modules for background step sync across iOS and Android.",
            tags: ["React Native", "Expo", "TypeScript", "Zustand", "Node.js", "RevenueCat", "HealthKit", "Google Fit"],
            gradient: "linear-gradient(135deg, #0a2e1a 0%, #1a4a2d 40%, #06d6a0 200%)",
            metrics: [{ value: "30+", label: "Screens" }, { value: "40+", label: "API Endpoints" }, { value: "iOS+Android", label: "Platforms" }],
        },
        {
            title: "Business Listing Portal",
            description: "Internal portal for managing business listings with role-based access control, secure payment integration, and DocuSign e-signature workflows. Architected for scale with CI/CD pipelines.",
            tags: ["React", "Next.js", "Node.js", "PostgreSQL", "GitHub Actions", "DocuSign API", "Stripe"],
            gradient: "linear-gradient(135deg, #0d1b2a 0%, #1b263b 40%, #00f5d4 200%)",
            metrics: [{ value: "5→1s", label: "Load Time" }, { value: "22%", label: "Faster Dev" }, { value: "25%", label: "Less Debt" }],
        },
        {
            title: "Beagle — Fintech Platform",
            description: "Built the web platform first using React & Next.js, then developed their internal company app with React Native & Flutter. Features pixel-perfect Figma implementations, a reusable design system, Firebase authentication, and push notification infrastructure.",
            tags: ["React", "Next.js", "React Native", "Flutter", "Tailwind", "Firebase", "Figma", "Redux"],
            gradient: "linear-gradient(135deg, #1a0a2e 0%, #3d1a5c 40%, #f72585 200%)",
            metrics: [{ value: "-24%", label: "Bounce Rate" }, { value: "-20%", label: "Bundle Size" }, { value: "Web+Mobile", label: "Platforms" }],
        },
        {
            title: "Legal Case Tracker — Investi",
            description: "Full-stack web application for tracking legal cases with dynamic dashboards, automated data pipelines, and multi-tenant access control supporting 300+ concurrent users.",
            tags: ["React", "Next.js", "Python", "REST APIs", "MongoDB", "Jest"],
            gradient: "linear-gradient(135deg, #0a1628 0%, #1a2d4a 40%, #4cc9f0 200%)",
            metrics: [{ value: "80%", label: "Test Coverage" }, { value: "50+hrs", label: "Saved/Month" }, { value: "300+", label: "Users" }],
        },
        {
            title: "Healthcare Analytics — Medtronic",
            description: "Data-heavy analytics dashboard for healthcare teams featuring interactive D3.js visualizations, Python-powered APIs, and HIPAA-compliant user permissions with automated reporting.",
            tags: ["React", "Next.js", "D3.js", "Chart.js", "Python", "HIPAA"],
            gradient: "linear-gradient(135deg, #1a0a1a 0%, #2d1a3d 40%, #7209b7 200%)",
            metrics: [{ value: "-38%", label: "API Response" }, { value: "5", label: "Depts Served" }, { value: "-30%", label: "Fewer Bugs" }],
        },
        {
            title: "ShopFlow — E-Commerce Platform",
            description: "High-performance e-commerce storefront with dynamic product filtering, real-time inventory sync, Stripe checkout, and a headless CMS-powered admin panel. Optimized for Core Web Vitals and SEO with server-side rendering.",
            tags: ["Next.js", "TypeScript", "Stripe", "Prisma", "PostgreSQL", "Tailwind", "Redis", "Vercel"],
            gradient: "linear-gradient(135deg, #1a1a0a 0%, #3d3a1a 40%, #fbbf24 200%)",
            metrics: [{ value: "98", label: "Lighthouse" }, { value: "2.1s", label: "LCP" }, { value: "3x", label: "Conv. Rate" }],
        },
        {
            title: "LearnPath — EdTech Platform",
            description: "Interactive learning platform with live video classrooms via WebRTC, real-time collaborative whiteboards, progress tracking dashboards, and an AI-powered quiz generator. Supports 5,000+ concurrent students.",
            tags: ["React", "Next.js", "WebRTC", "Socket.io", "Node.js", "MongoDB", "AWS", "Three.js"],
            gradient: "linear-gradient(135deg, #0a1a2e 0%, #1a3050 40%, #38bdf8 200%)",
            metrics: [{ value: "5k+", label: "Concurrent" }, { value: "99.7%", label: "Uptime" }, { value: "4.8★", label: "Rating" }],
        },
        {
            title: "NestEstate — Real Estate App",
            description: "Property listing platform with interactive 3D virtual tours powered by Three.js, map-based search with geolocation filters, mortgage calculators, and an agent scheduling system with real-time availability.",
            tags: ["React", "Next.js", "Three.js", "Mapbox", "Node.js", "PostgreSQL", "Firebase", "Framer Motion"],
            gradient: "linear-gradient(135deg, #1a0e0a 0%, #3d2a1a 40%, #f4a261 200%)",
            metrics: [{ value: "10k+", label: "Listings" }, { value: "3D Tours", label: "Featured" }, { value: "-40%", label: "Time to Lead" }],
        },
        {
            title: "TrackFleet — Logistics Dashboard",
            description: "Real-time fleet management dashboard with live GPS tracking on interactive maps, route optimization algorithms, driver performance analytics, and automated delivery notifications with ETA predictions.",
            tags: ["Vue 3", "Nuxt.js", "D3.js", "Mapbox", "FastAPI", "WebSockets", "Docker", "GCP"],
            gradient: "linear-gradient(135deg, #0a1e1a 0%, #1a3d35 40%, #34d399 200%)",
            metrics: [{ value: "500+", label: "Vehicles" }, { value: "Real-time", label: "GPS Tracking" }, { value: "-18%", label: "Fuel Costs" }],
        },
        {
            title: "AdLaunch — Campaign Creation Tool",
            description: "Internal campaign management platform for a marketing agency, enabling teams to create, schedule, and optimize native ad campaigns at scale. Integrated with Taboola, Outbrain, and RevContent APIs for multi-network publishing, with real-time spend tracking, A/B testing workflows, bulk asset uploads, and automated performance reporting dashboards.",
            tags: ["React", "Next.js", "Node.js", "Taboola API", "Outbrain API", "RevContent API", "PostgreSQL", "Redis", "TypeScript", "Tailwind"],
            gradient: "linear-gradient(135deg, #1a0a28 0%, #2e1a4a 40%, #a78bfa 200%)",
            metrics: [{ value: "3", label: "Ad Networks" }, { value: "1000+", label: "Campaigns/Mo" }, { value: "-60%", label: "Setup Time" }],
        },
        {
            title: "Pulse CRM — Client Management",
            description: "Lightweight CRM for freelancers and small agencies built with SvelteKit and server-side rendering. Features pipeline management with drag-and-drop Kanban boards, automated follow-up reminders, invoice generation, client communication timelines, and integrated email tracking.",
            tags: ["SvelteKit", "Svelte", "TypeScript", "Prisma", "PostgreSQL", "Tailwind", "Vercel", "Resend API"],
            gradient: "linear-gradient(135deg, #1a0a0a 0%, #3d1a1a 40%, #ff6b6b 200%)",
            metrics: [{ value: "Sub-50ms", label: "Navigation" }, { value: "500+", label: "Active Users" }, { value: "98", label: "Lighthouse" }],
        },
        {
            title: "StreamDeck — Live Event Dashboard",
            description: "Real-time event monitoring dashboard built with Svelte and SvelteKit for a live streaming platform. Features WebSocket-driven viewer analytics, chat moderation tools, donation tracking with animated overlays, stream health monitoring, and multi-stream management from a single interface.",
            tags: ["Svelte", "SvelteKit", "WebSockets", "D3.js", "Node.js", "Redis", "Docker", "TypeScript"],
            gradient: "linear-gradient(135deg, #0a1a10 0%, #1a3d22 40%, #22c55e 200%)",
            metrics: [{ value: "10k+", label: "Concurrent" }, { value: "Real-time", label: "Analytics" }, { value: "< 200ms", label: "Latency" }],
        },
    ];

    return (
        <main role="main" itemScope itemType="https://schema.org/Person" style={{ background: t.bg, color: t.text, minHeight: "100vh", overflowX: "hidden", position: "relative", transition: "background 0.4s, color 0.4s" }}>
            <meta itemProp="name" content="Diego Torres" />
            <meta itemProp="jobTitle" content="Senior Full Stack Engineer" />
            <meta itemProp="url" content="https://diego-torres-moran.vercel.app" />
            <meta itemProp="email" content="mju34170@gmail.com" />
            <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:ital,wght@0,400;0,500;0,700;1,400&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
            <style>
                {`
                    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
                    html { scroll-behavior: smooth; }
                    ::selection { background: ${t.selection}; color: ${t.accent}; }
                    ::-webkit-scrollbar { width: 6px; }
                    ::-webkit-scrollbar-track { background: ${t.scrollbarTrack}; }
                    ::-webkit-scrollbar-thumb { background: ${t.scrollbarThumb}; border-radius: 3px; }
                    @media (max-width: 768px) {
                    .nav-desktop { display: none !important; }
                    .nav-mobile-toggle, .nav-mobile-theme { display: block !important; }
                    .skills-grid, .projects-grid { grid-template-columns: 1fr !important; }
                    }
                    @keyframes pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }
                    @keyframes slideDown { from { opacity: 0; transform: translateY(-30px); } to { opacity: 1; transform: translateY(0); } }
                    @keyframes slideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
                    @keyframes gradient-shift { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
                    input:focus, textarea:focus { outline: none; border-color: ${t.accent} !important; box-shadow: 0 0 0 3px ${t.accent}11; }
                    .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }
                `}
            </style>

            {/* SEO-friendly hidden content for crawlers */}
            <div className="sr-only">
                <h1>Diego Torres — Senior Full Stack Engineer & Team Leader</h1>
                <p>Full stack developer based in Guayaquil, Ecuador with 7+ years of experience building scalable web and mobile applications. Specializing in React, Next.js, Vue, Svelte, SvelteKit, Angular, React Native, Flutter, Node.js, Nest.js, Python, Django, FastAPI, Flask, Three.js, D3.js, TypeScript, PostgreSQL, MongoDB, AWS, GCP, Azure, Docker, and CI/CD. Helped startups launch MVPs in 7-8 weeks, reduce development costs by 30%, and scale applications to 100,000+ users. Available for freelance, contract, and full-time opportunities worldwide. Experienced in fintech, healthcare, e-commerce, edtech, real estate, logistics, marketing technology, fitness, and SaaS industries.</p>
                <p>Key skills: React Developer, Next.js Developer, Node.js Developer, Full Stack Engineer, React Native Developer, Mobile App Developer, Frontend Engineer, Backend Engineer, Team Leader, TypeScript Expert, Python Developer, Vue.js Developer, Svelte Developer, SvelteKit Developer, Angular Developer, Three.js 3D Developer, Web Application Developer, API Developer, Startup Technical Co-founder, MVP Builder, Freelance Developer Ecuador.</p>
            </div>

            <div style={{
                position: "fixed", pointerEvents: "none", zIndex: 9999,
                left: cursorPos.x - 200, top: cursorPos.y - 200,
                width: 400, height: 400,
                background: `radial-gradient(circle, ${t.accent}08 0%, transparent 70%)`,
                transition: "left 0.15s ease-out, top 0.15s ease-out",
            }} />

            <Navbar activeSection={activeSection} theme={theme} toggleTheme={toggleTheme} t={t} />

            {/* ─── HERO ─────────────────────────────────────────── */}
            <section id="home" aria-label="Introduction" style={{ position: "relative", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "120px 40px 80px", overflow: "hidden" }}>
                <ThreeScene theme={theme} />
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 200, background: t.gradientOverlay, zIndex: 1 }} />
                <div style={{ position: "relative", zIndex: 2, textAlign: "center", maxWidth: 800 }}>
                    <div style={{ animation: "slideDown 1s cubic-bezier(.16,1,.3,1)", marginBottom: 24 }}>
                        <span style={{
                            display: "inline-block", padding: "8px 20px", borderRadius: 50,
                            background: t.accent + "14", border: `1px solid ${t.accent}33`,
                            fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: t.accent,
                            letterSpacing: 2, textTransform: "uppercase", animation: "pulse 3s ease-in-out infinite",
                        }}>Available for work</span>
                    </div>
                    <h1 style={{
                        fontFamily: "'Syne', sans-serif", fontWeight: 800,
                        fontSize: "clamp(40px, 7vw, 80px)", lineHeight: 1.05,
                        letterSpacing: -2, marginBottom: 12,
                        animation: "slideUp 1s cubic-bezier(.16,1,.3,1) 0.2s both",
                        color: t.text,
                    }}>
                        Diego Torres
                    </h1>
                    <h2 style={{
                        fontFamily: "'Syne', sans-serif", fontWeight: 700,
                        fontSize: "clamp(20px, 3.5vw, 36px)", lineHeight: 1.2,
                        marginBottom: 24,
                        background: "linear-gradient(135deg, #00f5d4, #4cc9f0, #7209b7)",
                        backgroundSize: "200% 200%",
                        WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                        animation: "slideUp 1s cubic-bezier(.16,1,.3,1) 0.35s both, gradient-shift 6s ease infinite",
                    }}>
                        Senior Full Stack Engineer
                    </h2>
                    <p style={{
                        fontFamily: "'DM Sans', sans-serif", fontSize: "clamp(15px, 1.8vw, 18px)",
                        color: t.textSecondary, maxWidth: 580, margin: "0 auto 20px",
                        lineHeight: 1.7, animation: "slideUp 1s cubic-bezier(.16,1,.3,1) 0.5s both",
                    }}>
                        Team Leader · Web & Mobile · Guayaquil, Ecuador
                    </p>
                    <p style={{
                        fontFamily: "'DM Sans', sans-serif", fontSize: "clamp(14px, 1.6vw, 16px)",
                        color: t.textMuted, maxWidth: 560, margin: "0 auto 40px",
                        lineHeight: 1.7, animation: "slideUp 1s cubic-bezier(.16,1,.3,1) 0.6s both",
                    }}>
                        Helping startups launch MVPs in 7-8 weeks, reduce costs by 30%, and scale to 100K+ users.
                        From 3D experiences to robust APIs - clean, scalable code with speed at the forefront.
                    </p>
                    <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap", animation: "slideUp 1s cubic-bezier(.16,1,.3,1) 0.7s both" }}>
                        <button onClick={() => document.getElementById("projects")?.scrollIntoView({ behavior: "smooth" })} style={{
                            padding: "14px 36px", borderRadius: 50, border: "none", cursor: "pointer",
                            background: t.accent, color: theme === "dark" ? "#080812" : "#fff",
                            fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 700,
                            letterSpacing: 0.5, transition: "all 0.3s",
                        }} onMouseEnter={e => { e.target.style.transform = "translateY(-2px)"; e.target.style.boxShadow = `0 10px 40px ${t.accent}44`; }}
                            onMouseLeave={e => { e.target.style.transform = "translateY(0)"; e.target.style.boxShadow = "none"; }}>
                            View My Work
                        </button>
                        <button onClick={() => document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" })} style={{
                            padding: "14px 36px", borderRadius: 50, cursor: "pointer",
                            background: "transparent", border: `1px solid ${t.border}`, color: t.textSecondary,
                            fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 500,
                            letterSpacing: 0.5, transition: "all 0.3s",
                        }} onMouseEnter={e => { e.target.style.borderColor = t.accent + "66"; e.target.style.color = t.accent; }}
                            onMouseLeave={e => { e.target.style.borderColor = t.border; e.target.style.color = t.textSecondary; }}>
                            Get in Touch
                        </button>
                    </div>
                </div>
            </section>

            {/* ─── ABOUT ────────────────────────────────────────── */}
            <section id="about" aria-label="About Diego Torres" style={{ padding: "120px 40px", maxWidth: 1100, margin: "0 auto" }}>
                <RevealSection>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 60, alignItems: "center" }}>
                        <div>
                            <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: "clamp(32px, 4vw, 46px)", fontWeight: 800, lineHeight: 1.1, letterSpacing: -1, marginBottom: 24, color: t.text }}>
                                From MVPs to <span style={{ color: t.accent }}>scale-ready</span> products
                            </h2>
                            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 16, color: t.textSecondary, lineHeight: 1.8, marginBottom: 16 }}>
                                Startups move fast, but technical execution often lags behind. I've seen this stall MVPs, break user experiences, and delay funding rounds. As a senior full stack engineer, I specialize in solving these problems across web and mobile platforms.
                            </p>
                            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 16, color: t.textSecondary, lineHeight: 1.8, marginBottom: 16 }}>
                                Whether it's high-performing landing pages, fully custom applications, API design, or 3D experiences - I focus on writing clean, scalable, and flexible code with user outcomes in mind and speed at the forefront.
                            </p>
                            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 16, color: t.textSecondary, lineHeight: 1.8 }}>
                                My stack spans React, Next.js, Svelte, Angular, Vue, and React Native on the front end, with Node.js, Nest.js, Python(FastAPI, Django, Flask), PostgreSQL, and MongoDB on the back. I deploy via AWS, Cloud Functions, and robust CI/CD pipelines.
                            </p>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                            <StatCounter value={7} suffix="+" label="Years Experience" t={t} />
                            <StatCounter value={100} suffix="k+" label="Users Scaled To" t={t} />
                            <StatCounter value={30} suffix="%" label="Cost Reduction" t={t} />
                            <StatCounter value={5} label="Week MVP Launch" prefix="~" t={t} />
                        </div>
                    </div>
                </RevealSection>
            </section>

            {/* ─── SKILLS ───────────────────────────────────────── */}
            <section id="skills" aria-label="Technical Skills" style={{ padding: "100px 40px 120px", maxWidth: 1100, margin: "0 auto" }}>
                <RevealSection>
                    <div style={{ textAlign: "center", marginBottom: 60 }}>
                        <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: "clamp(32px, 4vw, 46px)", fontWeight: 800, letterSpacing: -1, color: t.text }}>
                            Skills & <span style={{ color: "#f72585" }}>Expertise</span>
                        </h2>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginTop: 16 }}>
                            <span style={{
                                padding: "6px 16px", borderRadius: 50,
                                background: "rgba(247,37,133,0.1)", border: "1px solid rgba(247,37,133,0.2)",
                                fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 600, color: "#f72585",
                            }}>100+ Technologies</span>
                            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: t.textSubtle }}>across 10 categories</span>
                        </div>
                    </div>
                </RevealSection>
                <div className="skills-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 20 }}>
                    {skills.map((skill, i) => <SkillCard key={skill.title} {...skill} delay={i * 0.06} t={t} />)}
                </div>
            </section>

            {/* ─── EXPERIENCE ───────────────────────────────────── */}
            <section id="experience" aria-label="Work Experience" style={{ padding: "100px 40px 120px", maxWidth: 800, margin: "0 auto" }}>
                <RevealSection>
                    <div style={{ textAlign: "center", marginBottom: 60 }}>
                        <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: "clamp(32px, 4vw, 46px)", fontWeight: 800, letterSpacing: -1, color: t.text }}>
                            Work <span style={{ color: "#06d6a0" }}>Experience</span>
                        </h2>
                    </div>
                </RevealSection>
                <div>
                    {experience.map((exp, i) => (
                        <ExperienceCard key={exp.company} {...exp} isLast={i === experience.length - 1} delay={i * 0.1} t={t} />
                    ))}
                </div>
            </section>

            {/* ─── PROJECTS ─────────────────────────────────────── */}
            <section id="projects" aria-label="Featured Projects" style={{ padding: "100px 40px 120px", maxWidth: 1100, margin: "0 auto" }}>
                <RevealSection>
                    <div style={{ textAlign: "center", marginBottom: 60 }}>
                        <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: "clamp(32px, 4vw, 46px)", fontWeight: 800, letterSpacing: -1, color: t.text }}>
                            Selected <span style={{ color: "#7209b7" }}>Projects</span>
                        </h2>
                    </div>
                </RevealSection>
                <div className="projects-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 24 }}>
                    {projects.map((project, i) => <ProjectCard key={project.title} {...project} delay={i * 0.1} t={t} theme={theme} />)}
                </div>
            </section>

            {/* ─── CONTACT ──────────────────────────────────────── */}
            <section id="contact" aria-label="Contact Diego Torres" style={{ padding: "100px 40px 120px", maxWidth: 700, margin: "0 auto" }}>
                <RevealSection>
                    <div style={{ textAlign: "center", marginBottom: 50 }}>
                        <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: "clamp(32px, 4vw, 46px)", fontWeight: 800, letterSpacing: -1, color: t.text }}>
                            Get in <span style={{ color: "#4cc9f0" }}>Touch</span>
                        </h2>
                        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 16, color: t.textMuted, marginTop: 16, lineHeight: 1.7 }}>
                            Have a project in mind? Let's build something great together.
                        </p>
                        <a href="mailto:mju34170@gmail.com" style={{
                            display: "inline-block", marginTop: 12,
                            fontFamily: "'JetBrains Mono', monospace", fontSize: 14, color: t.accent,
                            textDecoration: "none", borderBottom: `1px solid ${t.accent}55`,
                            paddingBottom: 2, transition: "all 0.3s",
                        }}>mju34170@gmail.com</a>
                    </div>
                </RevealSection>
                <RevealSection delay={0.2}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                        {[
                            { name: "name", type: "text", placeholder: "Your Name" },
                            { name: "email", type: "email", placeholder: "your@email.com" },
                        ].map((field) => (
                            <input key={field.name} type={field.type} placeholder={field.placeholder} value={formData[field.name]}
                                onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                                style={{
                                    padding: "16px 20px", borderRadius: 14,
                                    background: t.bgInput, border: `1px solid ${t.border}`,
                                    color: t.text, fontFamily: "'DM Sans', sans-serif", fontSize: 15, transition: "all 0.3s",
                                }} />
                        ))}
                        <textarea placeholder="Tell me about your project..." value={formData.message}
                            onChange={(e) => setFormData({ ...formData, message: e.target.value })} rows={5}
                            style={{
                                padding: "16px 20px", borderRadius: 14, resize: "vertical",
                                background: t.bgInput, border: `1px solid ${t.border}`,
                                color: t.text, fontFamily: "'DM Sans', sans-serif", fontSize: 15, transition: "all 0.3s",
                            }} />
                        <button
                            onClick={handleSubmit}
                            disabled={formStatus === "sending"}
                            style={{
                                padding: "16px 40px", borderRadius: 50, border: "none", cursor: formStatus === "sending" ? "wait" : "pointer",
                                background: formStatus === "success" ? "linear-gradient(135deg, #06d6a0, #34d399)"
                                    : formStatus === "error" ? "linear-gradient(135deg, #f72585, #ff6b6b)"
                                        : `linear-gradient(135deg, ${t.accent}, #4cc9f0)`,
                                color: theme === "dark" ? "#080812" : "#fff",
                                fontFamily: "'DM Sans', sans-serif", fontSize: 15, fontWeight: 700,
                                letterSpacing: 0.5, transition: "all 0.4s", alignSelf: "flex-start",
                                opacity: formStatus === "sending" ? 0.7 : 1,
                            }}
                            onMouseEnter={e => { if (formStatus === "idle") { e.target.style.transform = "translateY(-2px)"; e.target.style.boxShadow = `0 10px 40px ${t.accent}44`; } }}
                            onMouseLeave={e => { e.target.style.transform = "none"; e.target.style.boxShadow = "none"; }}
                        >
                            {formStatus === "sending" ? "Sending..." : formStatus === "success" ? "Message Sent!" : formStatus === "error" ? "Failed - Try Again" : "Send Message"}
                        </button>
                    </div>
                </RevealSection>
            </section>

            {/* ─── FOOTER ───────────────────────────────────────── */}
            <footer style={{
                padding: "40px", borderTop: `1px solid ${t.border}`,
                display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16,
                maxWidth: 1100, margin: "0 auto",
            }}>
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: t.textSubtle }}>
                    2026 Diego Torres
                </span>
                <div style={{ display: "flex", gap: 24 }}>
                    {["GitHub"].map((platform) => (
                        <a key={platform} href="https://github.com/mvpcraft" style={{
                            fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: t.textSubtle,
                            textDecoration: "none", transition: "color 0.3s",
                        }} onMouseEnter={e => e.target.style.color = t.accent} onMouseLeave={e => e.target.style.color = t.textSubtle}>
                            {platform}
                        </a>
                    ))}
                </div>
            </footer>
        </main>
    );
}