import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import ParticleSystem from './Visualizations/ParticleSystem';
import VoronoiFracture from './Visualizations/VoronoiFracture';
import ImageSystem from './Visualizations/ImageSystem';
import FlowField from './Visualizations/shared/FlowField';
import Vector2 from './Visualizations/shared/Vector2';

const Canvas = forwardRef(({
  simulationMode,
  interactionMode,
  params,
  voronoiParams,
  imageParams,
  flowFieldParams
}, ref) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const visualizationRef = useRef(null);
  const flowFieldRef = useRef(null);
  const mouseRef = useRef({ x: 0, y: 0, isPressed: false });
  const tiltRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });

  const latestParams = useRef(params);
  const latestVoronoiParams = useRef(voronoiParams);
  const latestImageParams = useRef(imageParams);
  const latestFlowFieldParams = useRef(flowFieldParams);

  useEffect(() => {
    latestParams.current = params;
    latestVoronoiParams.current = voronoiParams;
    latestImageParams.current = imageParams;
    latestFlowFieldParams.current = flowFieldParams;
  }, [params, voronoiParams, imageParams, flowFieldParams]);

  const reset = () => {
    if (visualizationRef.current) {
      visualizationRef.current.reset();
    }
  };

  useImperativeHandle(ref, () => ({
    clearFlowField: () => {
      if (flowFieldRef.current) flowFieldRef.current.clear();
    },
    resetSimulation: reset
  }));

  useEffect(() => {
    const handleResize = () => setDimensions({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleOrientation = (event) => {
      tiltRef.current = { beta: event.beta, gamma: event.gamma };
    };

    if (interactionMode === 'tilt') {
      window.addEventListener('deviceorientation', handleOrientation);
    }

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, [interactionMode]);


  useEffect(() => {
    const initVisualization = async () => {
      const canvas = canvasRef.current;
      flowFieldRef.current = new FlowField(dimensions.width, dimensions.height, latestFlowFieldParams.current);
      
      let viz;
      if (simulationMode === 'particle') {
        viz = new ParticleSystem(canvas, latestParams.current, flowFieldRef.current);
      } else if (simulationMode === 'voronoi') {
        viz = new VoronoiFracture(canvas, latestVoronoiParams.current, latestParams.current, flowFieldRef.current);
      } else if (simulationMode === 'image') {
        viz = new ImageSystem(canvas, latestImageParams.current, latestParams.current, flowFieldRef.current);
      }
      
      if (viz) {
        await viz.init();
        visualizationRef.current = viz;
      }
    };
    
    initVisualization();
  }, [
      simulationMode, dimensions,
      params.text, params.fontSize, params.fontFamily, params.offsetX, params.offsetY, params.resolution,
      params.letterSpacing, params.lineHeight, params.scaleX, params.scaleY, params.shear,
      voronoiParams.cellCount,
      imageParams.imageUrl, imageParams.resolution, imageParams.renderMode, imageParams.asciiPattern,
      imageParams.scale, imageParams.offsetX, imageParams.offsetY
    ]);

  useEffect(() => {
    if (visualizationRef.current) {
      if(simulationMode === 'image') {
        visualizationRef.current.updateParams(latestParams.current, latestImageParams.current);
      } else if (simulationMode === 'voronoi') {
        visualizationRef.current.updateParams(latestParams.current, latestVoronoiParams.current);
      }
      else {
        visualizationRef.current.updateParams(latestParams.current);
      }
    }
  }, [params, voronoiParams, imageParams, simulationMode]);

  useEffect(() => {
    if (flowFieldRef.current) {
      flowFieldRef.current.updateParams(latestFlowFieldParams.current);
    }
  }, [flowFieldParams]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;

    const animate = () => {
      ctx.fillStyle = latestParams.current.backgroundColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      let gravity = null;
      if (interactionMode === 'tilt' && tiltRef.current) {
          const gravityX = (tiltRef.current.gamma / 90) * 0.4;
          const gravityY = (tiltRef.current.beta / 180) * 0.4;
          gravity = new Vector2(gravityX, gravityY);
      }

      if (latestFlowFieldParams.current.showField) flowFieldRef.current.draw(ctx);

      if (visualizationRef.current) {
        visualizationRef.current.update(mouseRef.current, interactionMode, gravity);
        visualizationRef.current.draw(ctx);
      }
      
      if (interactionMode === 'repel' && mouseRef.current.isPressed) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(mouseRef.current.x, mouseRef.current.y, latestParams.current.repelRadius, 0, Math.PI * 2);
        ctx.stroke();
      }
      animationRef.current = requestAnimationFrame(animate);
    };
    animate();
    return () => cancelAnimationFrame(animationRef.current);
  }, [dimensions, interactionMode]);

  const handleMouseMove = (e) => {
    if (interactionMode === 'tilt') return;
    const rect = canvasRef.current.getBoundingClientRect();
    mouseRef.current.x = e.clientX - rect.left;
    mouseRef.current.y = e.clientY - rect.top;
    if (mouseRef.current.isPressed && interactionMode === 'drawForce') {
      flowFieldRef.current.addPathPoint(mouseRef.current.x, mouseRef.current.y);
    }
  };

  const handleMouseDown = (e) => {
    if (interactionMode === 'tilt') {
      reset();
      return;
    }
    if (e.clientX > 300) { 
      mouseRef.current.isPressed = true;
      if (interactionMode === 'drawForce') {
        flowFieldRef.current.startPath(mouseRef.current.x, mouseRef.current.y);
      }
    }
  };

  const handleMouseUp = () => {
    if (interactionMode === 'tilt') return;
    mouseRef.current.isPressed = false;
    if (interactionMode === 'drawForce') {
      flowFieldRef.current.endPath();
    }
  };

  const handleTouchStart = (e) => {
    e.preventDefault();
    if (interactionMode === 'tilt') {
      reset();
      return;
    }
    const touch = e.touches[0];
    if (touch.clientX > 300) {
      mouseRef.current.isPressed = true;
      const rect = canvasRef.current.getBoundingClientRect();
      mouseRef.current.x = touch.clientX - rect.left;
      mouseRef.current.y = touch.clientY - rect.top;
      if (interactionMode === 'drawForce') {
        flowFieldRef.current.startPath(mouseRef.current.x, mouseRef.current.y);
      }
    }
  };

  const handleTouchMove = (e) => {
    e.preventDefault();
    if (interactionMode === 'tilt') return;
    if (!mouseRef.current.isPressed) return;
    const touch = e.touches[0];
    const rect = canvasRef.current.getBoundingClientRect();
    mouseRef.current.x = touch.clientX - rect.left;
    mouseRef.current.y = touch.clientY - rect.top;
    if (interactionMode === 'drawForce') {
      flowFieldRef.current.addPathPoint(mouseRef.current.x, mouseRef.current.y);
    }
  };

  const handleTouchEnd = (e) => {
    e.preventDefault();
    if (interactionMode === 'tilt') return;
    mouseRef.current.isPressed = false;
    if (interactionMode === 'drawForce') {
      flowFieldRef.current.endPath();
    }
  };


  return <canvas ref={canvasRef} onMouseMove={handleMouseMove} onMouseDown={handleMouseDown} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} onTouchCancel={handleTouchEnd} style={{ display: 'block' }} />;
});

Canvas.displayName = 'Canvas';
export default Canvas;