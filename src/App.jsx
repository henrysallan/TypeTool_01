import React, { useState, useCallback, useRef, useEffect } from 'react';
import Canvas from './components/Canvas';
import GUI from './components/GUI/GUI';
import './App.css';

const googleFonts = [
  { name: 'Roboto', url: 'https://fonts.googleapis.com/css2?family=Roboto&display=swap' },
  { name: 'Montserrat', url: 'https://fonts.googleapis.com/css2?family=Montserrat&display=swap' },
  { name: 'Lato', url: 'https://fonts.googleapis.com/css2?family=Lato&display=swap' },
  { name: 'Oswald', url: 'https://fonts.googleapis.com/css2?family=Oswald&display=swap' },
  { name: 'Playfair Display', url: 'https://fonts.googleapis.com/css2?family=Playfair+Display&display=swap' },
];

const initialTypographyParams = {
  offsetX: 0,
  offsetY: 0,
  letterSpacing: 0,
  lineHeight: 1.2,
  scaleX: 1,
  scaleY: 1,
  shear: 0,
};

const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

const initialParams = {
  text: 'Grid',
  fontSize: isMobile ? 150 : 250,
  fontFamily: 'Arial',
  fontUrl: '',
  ...initialTypographyParams,
  resolution: 4,
  particleSize: 1.5,
  particleColor: '#FFFFFF',
  backgroundColor: '#101010',
  useFill: false,
  strokeWeight: 1.5,
  flowInfluence: 0.0,
  flowSpeed: 2.0,
  stiffness: 0.05,
  damping: 0.95,
  gravityStrength: 10.0,
  repelRadius: 80,
  repelForce: 8,
  enableCurlNoise: false,
  noiseStrength: 0.5,
  noiseScale: 0.002,
  noiseSpeed: 0.001,
  showConnections: false,
  connectionDistance: 30,
  showClosestLines: false,
  closestSearchDistance: 60,
  maxClosestConnections: 2,
};

function App() {
  const [simulationMode, setSimulationMode] = useState('particle');
  const [interactionMode, setInteractionMode] = useState('repel');
  const canvasRef = useRef(null);
  const stiffnessRef = useRef(initialParams.stiffness);
  
  const [params, setParams] = useState(initialParams);

  const [voronoiParams, setVoronoiParams] = useState({
    cellCount: 300,
    useFill: false,
    fillColor: '#222222',
    strokeColor: '#FFFFFF',
    strokeWeight: 1.5,
    enableCollisions: true,
  });
  
  const [imageParams, setImageParams] = useState({
    imageUrl: 'https://images.pexels.com/photos/1528640/pexels-photo-1528640.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
    resolution: 20,
    renderMode: 'Dither',
    asciiPattern: 'Standard',
    scale: 1,
    offsetX: 0,
    offsetY: 0,
  });

  const [flowFieldParams, setFlowFieldParams] = useState({
    fieldResolution: 20,
    pathMagnitude: 1.0,
    pathInfluenceRadius: 100,
    showField: true,
    visualizeAsStreamlines: true,
    streamlineLength: 30,
    lineColor: '#00AACC',
    lineThickness: 1,
  });

  const updateParam = useCallback((paramSet, key, value) => {
    const setters = {
      params: setParams,
      voronoiParams: setVoronoiParams,
      imageParams: setImageParams,
      flowFieldParams: setFlowFieldParams,
    };
    if (key === 'stiffness') {
      stiffnessRef.current = value;
    }
    setters[paramSet](prev => ({ ...prev, [key]: value }));
  }, []);

  useEffect(() => {
    if (interactionMode === 'tilt') {
        stiffnessRef.current = params.stiffness;
        setParams(p => ({ ...p, stiffness: 0 }));
    } else {
        setParams(p => ({ ...p, stiffness: stiffnessRef.current }));
    }
  }, [interactionMode]);


  useEffect(() => {
    if (params.fontUrl) {
      const link = document.createElement('link');
      link.href = params.fontUrl;
      link.rel = 'stylesheet';
      document.head.appendChild(link);
      try {
        const url = new URL(params.fontUrl);
        const fontFamily = url.searchParams.get('family');
        if (fontFamily) {
          setParams(p => ({ ...p, fontFamily: fontFamily.split(':')[0] }));
        }
      } catch {
        console.error("Invalid font URL");
      }
    }
  }, [params.fontUrl]);

  const clearFlowField = useCallback(() => {
    if (canvasRef.current) canvasRef.current.clearFlowField();
  }, []);
  
  const resetSimulation = useCallback(() => {
    if (canvasRef.current) canvasRef.current.resetSimulation();
  }, []);

  const resetTypography = useCallback(() => {
    setParams(prev => ({...prev, ...initialTypographyParams}));
  }, []);

  return (
    <div className="app">
      <div className="canvas-container">
        <Canvas
          ref={canvasRef}
          simulationMode={simulationMode}
          interactionMode={interactionMode}
          params={params}
          voronoiParams={voronoiParams}
          imageParams={imageParams}
          flowFieldParams={flowFieldParams}
        />
      </div>
      <GUI
        simulationMode={simulationMode}
        setSimulationMode={setSimulationMode}
        interactionMode={interactionMode}
        setInteractionMode={setInteractionMode}
        params={params}
        voronoiParams={voronoiParams}
        imageParams={imageParams}
        flowFieldParams={flowFieldParams}
        updateParam={updateParam}
        onClearFlowField={clearFlowField}
        onReset={resetSimulation}
        onResetTypography={resetTypography}
        googleFonts={googleFonts}
      />
    </div>
  );
}

export default App;