import React, { useRef, useState, useEffect } from 'react';
import Folder from './Folder';
import Slider from './Slider';
import './styles.css';

const GUI = ({
  simulationMode,
  setSimulationMode,
  interactionMode,
  setInteractionMode,
  params,
  voronoiParams,
  imageParams,
  flowFieldParams,
  updateParam,
  onClearFlowField,
  onReset,
  onResetTypography,
  googleFonts,
}) => {
  const fileInputRef = useRef(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkForMobile = () => 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    setIsMobile(checkForMobile());
  }, []);


  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        updateParam('imageParams', 'imageUrl', event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const onUploadClick = () => fileInputRef.current.click();
  
  const handleTiltClick = () => {
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
      DeviceOrientationEvent.requestPermission()
        .then(permissionState => {
          if (permissionState === 'granted') {
            setInteractionMode('tilt');
          } else {
            alert('Permission to access device orientation was denied.');
          }
        })
        .catch(console.error);
    } else {
      // For browsers that don't require permission (e.g., Android)
      setInteractionMode('tilt');
    }
  };


  return (
    <div id="gui-container">
      <Folder title="Primary Controls" defaultOpen={true}>
        <div className="gui-row-column">
          <label>Simulation Mode</label>
          <select value={simulationMode} onChange={(e) => setSimulationMode(e.target.value)}>
            <option value="particle">Text Particles</option>
            <option value="voronoi">Text Voronoi</option>
            <option value="image">Image Particles</option>
          </select>
        </div>
        <div className="gui-row-column">
          <label>Interaction Mode</label>
          <div className="gui-button-group">
            <button className={`gui-button ${interactionMode === 'repel' ? 'active' : ''}`} onClick={() => setInteractionMode('repel')}>Repel</button>
            <button className={`gui-button ${interactionMode === 'drawForce' ? 'active' : ''}`} onClick={() => setInteractionMode('drawForce')}>Draw Path</button>
            {isMobile && (
              <button className={`gui-button ${interactionMode === 'tilt' ? 'active' : ''}`} onClick={handleTiltClick}>Tilt</button>
            )}
          </div>
        </div>
        <div className="gui-row-column">
            <button className="gui-button" onClick={onReset}>Reset Simulation</button>
        </div>
      </Folder>

      {simulationMode === 'image' && (
        <Folder title="Image Mode" defaultOpen={true}>
          <div className="gui-row-column">
            <label>Image URL</label>
            <input type="text" className="gui-input-text" value={imageParams.imageUrl} onChange={(e) => updateParam('imageParams', 'imageUrl', e.target.value)} placeholder="Paste image URL..."/>
          </div>
          <div className="gui-row-column">
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} style={{ display: 'none' }} accept="image/*"/>
            <button className="gui-button" onClick={onUploadClick}>Upload Image</button>
          </div>
          <Slider label="Mosaic Resolution" value={imageParams.resolution} min={4} max={100} step={1} onChange={(v) => updateParam('imageParams', 'resolution', v)} />
          <div className="gui-row-column">
            <label>Render Style</label>
            <select value={imageParams.renderMode} onChange={(e) => updateParam('imageParams', 'renderMode', e.target.value)}>
              <option value="Dither">Dither</option>
              <option value="Circles">Circles</option>
              <option value="ASCII">ASCII</option>
            </select>
          </div>
          {imageParams.renderMode === 'ASCII' && (
            <div className="gui-row-column">
              <label>ASCII Pattern</label>
              <select value={imageParams.asciiPattern} onChange={(e) => updateParam('imageParams', 'asciiPattern', e.target.value)}>
                <option value="Standard">Standard</option>
                <option value="Blocks">Blocks</option>
                <option value="Complex">Complex</option>
              </select>
            </div>
          )}
          <Slider label="Scale" value={imageParams.scale} min={0.1} max={5} step={0.01} onChange={(v) => updateParam('imageParams', 'scale', v)} />
          <Slider label="X Offset" value={imageParams.offsetX} min={-500} max={500} step={1} onChange={(v) => updateParam('imageParams', 'offsetX', v)} />
          <Slider label="Y Offset" value={imageParams.offsetY} min={-500} max={500} step={1} onChange={(v) => updateParam('imageParams', 'offsetY', v)} />
        </Folder>
      )}

      <Folder title="Look" defaultOpen={true}>
        {(simulationMode === 'particle' || simulationMode === 'image') && (
          <>
            <Slider label="Particle Size" value={params.particleSize} min={0.5} max={10} step={0.5} onChange={(v) => updateParam('params', 'particleSize', v)} />
            <div className="gui-checkbox"><input type="checkbox" checked={params.useFill} onChange={(e) => updateParam('params', 'useFill', e.target.checked)} /><label>Fill Particles</label></div>
            <Slider label="Stroke Weight" value={params.strokeWeight} min={0.5} max={5} step={0.5} onChange={(v) => updateParam('params', 'strokeWeight', v)} />
            <div className="gui-row-column"><label>Particle Color</label><input type="color" value={params.particleColor} onChange={(e) => updateParam('params', 'particleColor', e.target.value)} /></div>
          </>
        )}
        {simulationMode === 'voronoi' && (
          <>
            <div className="gui-checkbox"><input type="checkbox" checked={voronoiParams.useFill} onChange={(e) => updateParam('voronoiParams', 'useFill', e.target.checked)} /><label>Fill Pieces</label></div>
            <div className="gui-row-column"><label>Fill Color</label><input type="color" value={voronoiParams.fillColor} onChange={(e) => updateParam('voronoiParams', 'fillColor', e.target.value)} /></div>
            <div className="gui-row-column"><label>Stroke Color</label><input type="color" value={voronoiParams.strokeColor} onChange={(e) => updateParam('voronoiParams', 'strokeColor', e.target.value)} /></div>
            <Slider label="Stroke Weight" value={voronoiParams.strokeWeight} min={0.5} max={5} step={0.5} onChange={(v) => updateParam('voronoiParams', 'strokeWeight', v)} />
          </>
        )}
        {(simulationMode === 'particle' || simulationMode === 'voronoi') &&
          <Folder title="Typography" defaultOpen={false}>
              <div className="gui-row-column"><label>Text</label><textarea className="gui-textarea" value={params.text} onChange={(e) => updateParam('params', 'text', e.target.value)} /></div>
              <div className="gui-row-column"><label>Font</label><select value={params.fontUrl} onChange={(e) => updateParam('params', 'fontUrl', e.target.value)}><option value="">Default</option>{googleFonts.map(font => (<option key={font.name} value={font.url}>{font.name}</option>))}</select></div>
              <div className="gui-row-column"><label>Google Font URL</label><input type="text" className="gui-input-text" value={params.fontUrl} onChange={(e) => updateParam('params', 'fontUrl', e.target.value)} placeholder="Paste Google Font URL..."/></div>
              <Slider label="Font Size" value={params.fontSize} min={50} max={500} step={10} onChange={(v) => updateParam('params', 'fontSize', v)} />
              <Slider label="X Offset" value={params.offsetX} min={-500} max={500} step={1} onChange={(v) => updateParam('params', 'offsetX', v)} />
              <Slider label="Y Offset" value={params.offsetY} min={-500} max={500} step={1} onChange={(v) => updateParam('params', 'offsetY', v)} />
              <Slider label="Letter Spacing" value={params.letterSpacing} min={-10} max={50} step={0.5} onChange={(v) => updateParam('params', 'letterSpacing', v)} />
              <Slider label="Line Height" value={params.lineHeight} min={0.5} max={3} step={0.1} onChange={(v) => updateParam('params', 'lineHeight', v)} />
              <Slider label="Stretch" value={params.scaleX} min={0.1} max={3} step={0.05} onChange={(v) => updateParam('params', 'scaleX', v)} />
              <Slider label="Squash" value={params.scaleY} min={0.1} max={3} step={0.05} onChange={(v) => updateParam('params', 'scaleY', v)} />
              <Slider label="Shear" value={params.shear} min={-1} max={1} step={0.01} onChange={(v) => updateParam('params', 'shear', v)} />
              <button className="gui-button clear-btn" onClick={onResetTypography}>Reset Typography</button>
          </Folder>
        }
        <Folder title="Line Effects" defaultOpen={false}>
            <div className="gui-checkbox"><input type="checkbox" checked={params.showConnections} onChange={(e) => updateParam('params', 'showConnections', e.target.checked)} /><label>Show Plexus</label></div>
            <Slider label="Plexus Distance" value={params.connectionDistance} min={10} max={200} step={1} onChange={(v) => updateParam('params', 'connectionDistance', v)} />
            <div className="gui-checkbox"><input type="checkbox" checked={params.showClosestLines} onChange={(e) => updateParam('params', 'showClosestLines', e.target.checked)} /><label>Show Closest Lines</label></div>
            <Slider label="Search Distance" value={params.closestSearchDistance} min={20} max={200} step={1} onChange={(v) => updateParam('params', 'closestSearchDistance', v)} />
            <Slider label="Connections" value={params.maxClosestConnections} min={1} max={10} step={1} onChange={(v) => updateParam('params', 'maxClosestConnections', v)} />
        </Folder>
        <div className="gui-row-column"><label>Background</label><input type="color" value={params.backgroundColor} onChange={(e) => updateParam('params', 'backgroundColor', e.target.value)} /></div>
      </Folder>

      <Folder title="Feel" defaultOpen={true}>
        {simulationMode === 'voronoi' && (
          <>
            <Slider label="Cell Count" value={voronoiParams.cellCount} min={50} max={1000} step={10} onChange={(v) => updateParam('voronoiParams', 'cellCount', v)} />
            <div className="gui-checkbox"><input type="checkbox" checked={voronoiParams.enableCollisions} onChange={(e) => updateParam('voronoiParams', 'enableCollisions', e.target.checked)} /><label>Enable Collisions</label></div>
          </>
        )}
         {simulationMode === 'particle' && (
           <Slider label="Resolution" value={params.resolution} min={1} max={10} step={1} onChange={(v) => updateParam('params', 'resolution', v)} />
         )}
        <Folder title="Shared Physics" defaultOpen={false}>
            <Slider label="Flow Influence" value={params.flowInfluence} min={0} max={1} step={0.01} onChange={(v) => updateParam('params', 'flowInfluence', v)} />
            <Slider label="Flow Speed" value={params.flowSpeed} min={0.1} max={5} step={0.1} onChange={(v) => updateParam('params', 'flowSpeed', v)} />
            <Slider label="Stiffness" value={params.stiffness} min={0.01} max={0.3} step={0.01} onChange={(v) => updateParam('params', 'stiffness', v)} />
            <Slider label="Damping" value={params.damping} min={0.9} max={1} step={0.01} onChange={(v) => updateParam('params', 'damping', v)} />
            <Slider label="Repel Radius" value={params.repelRadius} min={20} max={200} step={1} onChange={(v) => updateParam('params', 'repelRadius', v)} />
            <Slider label="Repel Force" value={params.repelForce} min={1} max={20} step={1} onChange={(v) => updateParam('params', 'repelForce', v)} />
        </Folder>
        <Folder title="Force Field" defaultOpen={false}>
            <Slider label="Display Res" value={flowFieldParams.fieldResolution} min={10} max={50} step={1} onChange={(v) => updateParam('flowFieldParams', 'fieldResolution', v)} />
            <Slider label="Path Strength" value={flowFieldParams.pathMagnitude} min={0} max={5} step={0.1} onChange={(v) => updateParam('flowFieldParams', 'pathMagnitude', v)} />
            <Slider label="Path Radius" value={flowFieldParams.pathInfluenceRadius} min={20} max={300} step={1} onChange={(v) => updateParam('flowFieldParams', 'pathInfluenceRadius', v)} />
            <div className="gui-checkbox"><input type="checkbox" checked={flowFieldParams.showField} onChange={(e) => updateParam('flowFieldParams', 'showField', e.target.checked)} /><label>Visualize Field</label></div>
            <div className="gui-checkbox"><input type="checkbox" checked={flowFieldParams.visualizeAsStreamlines} onChange={(e) => updateParam('flowFieldParams', 'visualizeAsStreamlines', e.target.checked)} /><label>Visualize as Streamlines</label></div>
            <Slider label="Streamline Length" value={flowFieldParams.streamlineLength} min={5} max={100} step={1} onChange={(v) => updateParam('flowFieldParams', 'streamlineLength', v)} />
            <button className="gui-button clear-btn" onClick={onClearFlowField}>Clear Force Field</button>
        </Folder>
        {simulationMode === 'particle' && (
             <Folder title="Curl Noise" defaultOpen={false}>
                <div className="gui-checkbox"><input type="checkbox" checked={params.enableCurlNoise} onChange={(e) => updateParam('params', 'enableCurlNoise', e.target.checked)} /><label>Enable Noise</label></div>
                <Slider label="Strength" value={params.noiseStrength} min={0.1} max={5} step={0.1} onChange={(v) => updateParam('params', 'noiseStrength', v)} />
                <Slider label="Scale" value={params.noiseScale} min={0.001} max={0.05} step={0.001} onChange={(v) => updateParam('params', 'noiseScale', v)} />
                <Slider label="Speed" value={params.noiseSpeed} min={0.0001} max={0.002} step={0.0001} onChange={(v) => updateParam('params', 'noiseSpeed', v)} />
            </Folder>
        )}
      </Folder>
    </div>
  );
};

export default GUI;