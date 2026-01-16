import React, { useState, useEffect, useRef } from "react";
import * as THREE from "three";
const API_URL = "https://simons-backend-1.onrender.com";
const STREAMLIT_URL = "https://simons-backend-1.onrender.com/streamlit";



const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [username, setUsername] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [streamlitUrl, setStreamlitUrl] = useState("");

  const canvasRef = useRef(null);

  // Auto login check
  useEffect(() => {
    const checkAuth = async () => {
      const token = await window.storage?.get("token").catch(() => null);
      const user = await window.storage?.get("current_user").catch(() => null);
      
      if (token?.value && user?.value) {
        setCurrentUser(JSON.parse(user.value));
        setIsAuthenticated(true);
        setStreamlitUrl(`${STREAMLIT_URL}?token=${token.value}`);

      }
    };
    checkAuth();
  }, []);

  // Three.js background with candlesticks
  useEffect(() => {
    if (!canvasRef.current) return;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000000, 0.015);
    
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );

    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      alpha: true,
      antialias: true,
    });

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    camera.position.set(0, 8, 35);

    const ambientLight = new THREE.AmbientLight(0x0a4a5a, 0.4);
    scene.add(ambientLight);

    const light1 = new THREE.PointLight(0x00ffff, 2, 80);
    light1.position.set(15, 10, 15);
    scene.add(light1);

    const light2 = new THREE.PointLight(0xff0080, 1.5, 80);
    light2.position.set(-15, 10, -15);
    scene.add(light2);

    // Enhanced particles - REDUCED COUNT
    const particleCount = 800;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 100;
      positions[i + 1] = (Math.random() - 0.5) * 50;
      positions[i + 2] = (Math.random() - 0.5) * 100;
      
      const col = Math.random() > 0.6 ? 0xff0080 : 0x00ffff;
      const color = new THREE.Color(col);
      colors[i] = color.r;
      colors[i + 1] = color.g;
      colors[i + 2] = color.b;
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.2,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    // Candlestick charts in 3D - BIGGER SIZE
    const candlesticks = [];
    const candleCount = 35;
    
    for (let i = 0; i < candleCount; i++) {
      const isGreen = Math.random() > 0.5;
      const height = Math.random() * 5 + 1.5; // INCREASED HEIGHT
      const wickHeight = height + Math.random() * 2.5;
      
      // Candlestick body - BIGGER
      const bodyGeo = new THREE.BoxGeometry(1.2, height, 0.6);
      const bodyMat = new THREE.MeshStandardMaterial({
        color: isGreen ? 0x00ff88 : 0xff4466,
        emissive: isGreen ? 0x00ff88 : 0xff4466,
        emissiveIntensity: 0.4,
        metalness: 0.7,
        roughness: 0.3,
      });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      
      // Wick - THICKER
      const wickGeo = new THREE.BoxGeometry(0.15, wickHeight, 0.15);
      const wickMat = new THREE.MeshStandardMaterial({
        color: isGreen ? 0x00ff88 : 0xff4466,
        emissive: isGreen ? 0x00ff88 : 0xff4466,
        emissiveIntensity: 0.3,
      });
      const wick = new THREE.Mesh(wickGeo, wickMat);
      
      const group = new THREE.Group();
      group.add(body);
      group.add(wick);
      
      // Position around login box in circular pattern
      const angle = (i / candleCount) * Math.PI * 2;
      const radius = 18; // Circle radius around center
      
      group.position.x = Math.cos(angle) * radius;
      group.position.y = -8 + Math.sin(i * 0.5) * 2;
      group.position.z = Math.sin(angle) * radius - 5;
      
      scene.add(group);
      candlesticks.push(group);
    }

    // Grid
    const gridHelper = new THREE.GridHelper(100, 100, 0x00ffff, 0x003344);
    gridHelper.position.y = -15;
    gridHelper.material.transparent = true;
    gridHelper.material.opacity = 0.3;
    scene.add(gridHelper);

    // Data lines
    const lineMat = new THREE.LineBasicMaterial({ 
      color: 0x00ffff, 
      transparent: true, 
      opacity: 0.6 
    });
    const linePoints = [];
    for (let i = 0; i < 30; i++) {
      linePoints.push(
        new THREE.Vector3(
          i * 2 - 30,
          Math.sin(i * 0.3) * 3 - 5,
          -10
        )
      );
    }
    const lineGeo = new THREE.BufferGeometry().setFromPoints(linePoints);
    const line = new THREE.Line(lineGeo, lineMat);
    scene.add(line);

    let mouseX = 0, mouseY = 0;

    const onMouseMove = (e) => {
      mouseX = (e.clientX / window.innerWidth) * 2 - 1;
      mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
    };

    window.addEventListener("mousemove", onMouseMove);

    const animate = () => {
      requestAnimationFrame(animate);
      const t = Date.now() * 0.001;

      particles.rotation.y = t * 0.04;
      particles.rotation.x = Math.sin(t * 0.15) * 0.1;

      candlesticks.forEach((candle, i) => {
        candle.rotation.y = Math.sin(t + i * 0.3) * 0.02;
        candle.position.y = -8 + Math.sin(t * 0.5 + i * 0.2) * 0.15;
      });

      line.rotation.y = t * 0.1;

      camera.position.x += (mouseX * 5 - camera.position.x) * 0.03;
      camera.position.y += (8 - mouseY * 4 - camera.position.y) * 0.03;
      camera.lookAt(0, 0, 0);

      light1.position.x = Math.sin(t * 0.5) * 20;
      light1.position.z = Math.cos(t * 0.5) * 20;

      renderer.render(scene, camera);
    };

    animate();

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      geometry.dispose();
      material.dispose();
    };
  }, []);

  // AUTH HANDLER
  const handleAuth = async () => {
    setError("");

    if (mode === "signup") {
      if (!username || !email || !password || !confirmPassword) {
        setError("All fields are required");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match");
        return;
      }
    } else {
      if (!email || !password) {
        setError("Email and password are required");
        return;
      }
    }

    setIsLoading(true);

    try {
      const url =
        mode === "signup"
          ? `${API_URL}/signup`
          : `${API_URL}/login`;


      const payload =
        mode === "signup"
          ? { username, email, password }
          : { email, password };

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setIsLoading(false);
        setError(data.detail || "Authentication failed");
        return;
      }

      if (mode === "signup") {
        setIsLoading(false);
        setMode("login");
        alert("Account created. Please login.");
        return;
      }

      if (window.storage) {
        await window.storage.set("token", data.token);
        await window.storage.set("current_user", JSON.stringify(data.user));
      }
      
      setCurrentUser(data.user);
      setIsAuthenticated(true);
      setStreamlitUrl(`${STREAMLIT_URL}?token=${data.token}`);

      setIsLoading(false);
    } catch {
      setIsLoading(false);
      setError("Backend not reachable. Please try again later.");

    }
  };

  const handleLogout = async () => {
    if (window.storage) {
      await window.storage.delete("token").catch(() => {});
      await window.storage.delete("current_user").catch(() => {});
    }
    setIsAuthenticated(false);
    setCurrentUser(null);
    setStreamlitUrl("");
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") handleAuth();
  };

  // ================= LOGIN UI ===================
  if (!isAuthenticated) {
    return (
      <div className="relative w-full h-screen bg-gradient-to-b from-black via-gray-900 to-black overflow-hidden font-mono">
        <canvas ref={canvasRef} className="absolute inset-0 z-0" />

        {/* Scanlines effect */}
        <div className="absolute inset-0 z-[1] pointer-events-none opacity-10" 
             style={{
               backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,255,0.1) 2px, rgba(0,255,255,0.1) 4px)'
             }}></div>

        {/* Top Ticker Bar */}
        <div className="absolute top-0 w-full bg-gradient-to-r from-black/90 via-gray-900/90 to-black/90 border-b border-cyan-500/30 backdrop-blur-sm z-20">
          <div className="flex justify-around items-center py-3 px-8">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-gray-400 text-xs">BTC/USD</span>
              <span className="text-green-400 font-bold text-sm">$48,234.50</span>
              <span className="text-green-400 text-xs">+2.34%</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-gray-400 text-xs">ETH/USD</span>
              <span className="text-green-400 font-bold text-sm">$3,421.18</span>
              <span className="text-green-400 text-xs">+1.87%</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-gray-400 text-xs">SOL/USD</span>
              <span className="text-red-400 font-bold text-sm">$98.43</span>
              <span className="text-red-400 text-xs">-0.52%</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse"></div>
              <span className="text-gray-400 text-xs">STATUS</span>
              <span className="text-cyan-400 font-bold text-xs">OPERATIONAL</span>
            </div>
          </div>
        </div>

        {/* Login Box */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
          <div className="w-[520px] bg-gradient-to-br from-black/90 via-gray-900/90 to-black/90 
                          backdrop-blur-2xl border-2 border-cyan-400/60 p-12
                          shadow-[0_0_100px_rgba(0,255,255,0.5),0_0_200px_rgba(0,255,255,0.3),inset_0_0_80px_rgba(0,255,255,0.08)] 
                          relative overflow-hidden
                          before:absolute before:inset-0 before:bg-gradient-to-br before:from-cyan-500/10 before:via-transparent before:to-pink-500/10
                          after:absolute after:inset-[1px] after:bg-gradient-to-br after:from-black/50 after:to-transparent after:-z-10">
            
            {/* Animated corner accents */}
            <div className="absolute top-0 left-0 w-20 h-20 border-t-4 border-l-4 border-cyan-400 
                          shadow-[0_0_20px_rgba(0,255,255,0.8)] animate-pulse"></div>
            <div className="absolute top-0 right-0 w-20 h-20 border-t-4 border-r-4 border-cyan-400
                          shadow-[0_0_20px_rgba(0,255,255,0.8)] animate-pulse"></div>
            <div className="absolute bottom-0 left-0 w-20 h-20 border-b-4 border-l-4 border-pink-500
                          shadow-[0_0_20px_rgba(255,0,128,0.8)] animate-pulse"></div>
            <div className="absolute bottom-0 right-0 w-20 h-20 border-b-4 border-r-4 border-pink-500
                          shadow-[0_0_20px_rgba(255,0,128,0.8)] animate-pulse"></div>

            {/* Top glowing line */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-0.5 
                          bg-gradient-to-r from-transparent via-cyan-400 to-transparent
                          shadow-[0_0_20px_rgba(0,255,255,1)]"></div>
            
            {/* Bottom glowing line */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3/4 h-0.5 
                          bg-gradient-to-r from-transparent via-pink-500 to-transparent
                          shadow-[0_0_20px_rgba(255,0,128,1)]"></div>

            <div className="relative z-10">
              <h1 className="text-6xl text-center font-black mb-3 tracking-[0.35em]
                           bg-gradient-to-r from-cyan-300 via-cyan-400 to-blue-400 bg-clip-text text-transparent
                           drop-shadow-[0_0_30px_rgba(0,255,255,1)]
                           animate-pulse">
                SIMONS
              </h1>
              <p className="text-center text-sm text-cyan-300/90 mb-1 tracking-[0.25em] font-light
                          drop-shadow-[0_0_10px_rgba(0,255,255,0.8)]">
                QUANTITATIVE TRADING ENGINE
              </p>
              
              <div className="flex items-center justify-center gap-3 mb-8 text-[11px] text-gray-400">
                <span className="px-3 py-1.5 border border-cyan-500/50 bg-cyan-950/30 text-cyan-400
                              shadow-[0_0_10px_rgba(0,255,255,0.3)]">v4.2.1</span>
                <span className="text-cyan-400">●</span>
                <span className="px-3 py-1.5 border border-cyan-500/50 bg-cyan-950/30 text-cyan-400
                              shadow-[0_0_10px_rgba(0,255,255,0.3)]">QUANT AI</span>
                <span className="text-cyan-400">●</span>
                <span className="px-3 py-1.5 border border-green-600 text-green-400 bg-green-950/40
                              shadow-[0_0_15px_rgba(0,255,0,0.5)] animate-pulse">● LIVE</span>
              </div>

              {/* Mode Switcher with glow */}
              <div className="flex mb-8 bg-black/70 p-1.5 border-2 border-cyan-500/40 
                            shadow-[0_0_20px_rgba(0,255,255,0.2)]">
                <button
                  className={`flex-1 py-3 transition-all duration-300 font-bold tracking-[0.2em] text-sm relative overflow-hidden ${
                    mode === "login"
                      ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-black shadow-[0_0_30px_rgba(0,255,255,0.8),inset_0_0_20px_rgba(255,255,255,0.2)]"
                      : "text-cyan-400/70 hover:text-cyan-300 hover:bg-cyan-500/10 hover:shadow-[0_0_15px_rgba(0,255,255,0.3)]"
                  }`}
                  onClick={() => setMode("login")}
                >
                  LOGIN
                </button>
                <button
                  className={`flex-1 py-3 transition-all duration-300 font-bold tracking-[0.2em] text-sm relative overflow-hidden ${
                    mode === "signup"
                      ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-black shadow-[0_0_30px_rgba(0,255,255,0.8),inset_0_0_20px_rgba(255,255,255,0.2)]"
                      : "text-cyan-400/70 hover:text-cyan-300 hover:bg-cyan-500/10 hover:shadow-[0_0_15px_rgba(0,255,255,0.3)]"
                  }`}
                  onClick={() => setMode("signup")}
                >
                  SIGN UP
                </button>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-950/70 border-2 border-red-500 text-red-400 text-sm flex items-center gap-2
                              shadow-[0_0_20px_rgba(255,0,0,0.5)]">
                  <span className="text-lg">⚠</span>
                  <span>{error}</span>
                </div>
              )}

              {mode === "signup" && (
                <div className="mb-5">
                  <label className="block text-xs text-cyan-300 mb-2 tracking-[0.15em] font-semibold
                                  drop-shadow-[0_0_5px_rgba(0,255,255,0.8)]">OPERATOR ID</label>
                  <input
                    className="w-full p-4 bg-black/80 border-2 border-cyan-500/60 text-cyan-100 font-mono
                             focus:border-cyan-400 focus:shadow-[0_0_25px_rgba(0,255,255,0.6),inset_0_0_10px_rgba(0,255,255,0.1)]
                             outline-none transition-all placeholder-gray-600
                             shadow-[0_0_10px_rgba(0,255,255,0.2)]"
                    placeholder="Enter username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
              )}

              <div className="mb-5">
                <label className="block text-xs text-cyan-300 mb-2 tracking-[0.15em] font-semibold
                                drop-shadow-[0_0_5px_rgba(0,255,255,0.8)]">
                  {mode === "signup" ? "EMAIL ADDRESS" : "USER ID / EMAIL"}
                </label>
                <input
                  className="w-full p-4 bg-black/80 border-2 border-cyan-500/60 text-cyan-100 font-mono
                           focus:border-cyan-400 focus:shadow-[0_0_25px_rgba(0,255,255,0.6),inset_0_0_10px_rgba(0,255,255,0.1)]
                           outline-none transition-all placeholder-gray-600
                           shadow-[0_0_10px_rgba(0,255,255,0.2)]"
                  placeholder="Enter email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyPress={handleKeyPress}
                />
              </div>

              <div className="mb-5">
                <label className="block text-xs text-cyan-300 mb-2 tracking-[0.15em] font-semibold
                                drop-shadow-[0_0_5px_rgba(0,255,255,0.8)]">SECURITY KEY</label>
                <input
                  type="password"
                  className="w-full p-4 bg-black/80 border-2 border-cyan-500/60 text-cyan-100 font-mono
                           focus:border-cyan-400 focus:shadow-[0_0_25px_rgba(0,255,255,0.6),inset_0_0_10px_rgba(0,255,255,0.1)]
                           outline-none transition-all placeholder-gray-600
                           shadow-[0_0_10px_rgba(0,255,255,0.2)]"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyPress={handleKeyPress}
                />
              </div>

              {mode === "signup" && (
                <div className="mb-6">
                  <label className="block text-xs text-cyan-300 mb-2 tracking-[0.15em] font-semibold
                                  drop-shadow-[0_0_5px_rgba(0,255,255,0.8)]">CONFIRM KEY</label>
                  <input
                    type="password"
                    className="w-full p-4 bg-black/80 border-2 border-cyan-500/60 text-cyan-100 font-mono
                             focus:border-cyan-400 focus:shadow-[0_0_25px_rgba(0,255,255,0.6),inset_0_0_10px_rgba(0,255,255,0.1)]
                             outline-none transition-all placeholder-gray-600
                             shadow-[0_0_10px_rgba(0,255,255,0.2)]"
                    placeholder="••••••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              )}

              <button
                onClick={handleAuth}
                disabled={isLoading}
                className="w-full mt-6 py-5 bg-gradient-to-r from-cyan-500 via-blue-500 to-cyan-500 
                         text-black font-black tracking-[0.25em] text-sm
                         shadow-[0_0_40px_rgba(0,255,255,0.8),0_0_80px_rgba(0,255,255,0.4),inset_0_0_20px_rgba(255,255,255,0.2)]
                         hover:shadow-[0_0_60px_rgba(0,255,255,1),0_0_120px_rgba(0,255,255,0.6)]
                         disabled:opacity-50 disabled:cursor-not-allowed
                         transition-all duration-300 relative overflow-hidden group
                         border-2 border-cyan-300"
              >
                <span className="relative z-10 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                  {isLoading
                    ? "◢ INITIALIZING SYSTEM ◣"
                    : mode === "login"
                    ? "◢ INITIALIZE CONNECTION ◣"
                    : "◢ CREATE OPERATOR ◣"}
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent 
                              translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
              </button>

              <div className="mt-7 pt-6 border-t border-cyan-500/30 flex justify-center items-center gap-6 text-[10px]">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(0,255,0,0.8)]"></div>
                  <span className="text-green-400 font-semibold drop-shadow-[0_0_5px_rgba(0,255,0,0.8)]">ALGO ACTIVE</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(0,255,255,0.8)]"></div>
                  <span className="text-cyan-400 font-semibold drop-shadow-[0_0_5px_rgba(0,255,255,0.8)]">MARKET FEED</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(0,100,255,0.8)]"></div>
                  <span className="text-blue-400 font-semibold drop-shadow-[0_0_5px_rgba(0,100,255,0.8)]">SECURE</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom status bar */}
        <div className="absolute bottom-0 w-full bg-black/80 border-t border-cyan-500/30 backdrop-blur-sm z-20 py-1.5 px-6">
          <div className="flex justify-between items-center text-[10px] text-gray-500">
            <span>© 2026 SIMONS QUANT ENGINE</span>
            <div className="flex gap-6">
              <span>LATENCY: <span className="text-green-400">12ms</span></span>
              <span>UPTIME: <span className="text-cyan-400">99.99%</span></span>
              <span>REGION: <span className="text-cyan-400">ASIA-PACIFIC</span></span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ================= AFTER LOGIN ===================
  return (
    <div className="w-full h-screen bg-black relative">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-r from-black via-gray-900 to-black 
                    border-b border-cyan-500/30 backdrop-blur-sm z-50 flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
            SIMONS
          </h1>
          <span className="text-xs text-gray-500">|</span>
          <span className="text-sm text-cyan-400">Welcome, {currentUser?.username || currentUser?.email}</span>
        </div>
        
        <button
          onClick={handleLogout}
          className="px-6 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white text-sm font-bold
                   hover:from-red-500 hover:to-red-600 transition-all
                   border border-red-500/50 shadow-[0_0_15px_rgba(255,0,0,0.3)]"
        >
          ◢ LOGOUT ◣
        </button>
      </div>
      
      <iframe
        src={streamlitUrl}
        className="w-full h-full pt-16"
        title="Streamlit Trading Dashboard"
      ></iframe>
    </div>
  );
};

export default App;