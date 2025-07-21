import React, { useState, useEffect, useRef } from 'react';

const Slider = ({ label, value, min, max, step, onChange }) => {
  const [localValue, setLocalValue] = useState(value);
  const inputRef = useRef(null);
  const dragState = useRef({
    isDragging: false,
    initialX: 0,
    initialValue: 0,
  });

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleSliderChange = (e) => {
    const newValue = parseFloat(e.target.value);
    setLocalValue(newValue);
    onChange(newValue);
  };

  const handleInputChange = (e) => {
    const stringValue = e.target.value;
    if (stringValue === '' || stringValue === '-') {
      setLocalValue(stringValue);
      return;
    }
    const newValue = parseFloat(stringValue);
    if (!isNaN(newValue)) {
      setLocalValue(newValue);
      if (newValue >= min && newValue <= max) {
        onChange(newValue);
      }
    }
  };

  const handleInputBlur = () => {
    if (localValue === '' || localValue === '-') {
      setLocalValue(value);
    }
  };

  const handleMouseDown = (e) => {
    dragState.current = {
      isDragging: true,
      initialX: e.clientX,
      initialValue: parseFloat(value),
    };
    document.body.style.cursor = 'ew-resize';
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e) => {
    if (dragState.current.isDragging) {
      const dx = e.clientX - dragState.current.initialX;
      let increment = step;
      if (e.shiftKey) increment *= 10;
      if (e.altKey) increment /= 10;
      
      const valueChange = Math.round(dx / (e.shiftKey ? 2 : 5)) * increment;
      let newValue = dragState.current.initialValue + valueChange;
      
      newValue = Math.max(min, Math.min(max, newValue));
      
      onChange(newValue);
    }
  };

  const handleMouseUp = () => {
    dragState.current.isDragging = false;
    document.body.style.cursor = 'default';
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  const decimals = step.toString().includes('.') ? step.toString().split('.')[1].length : 0;
  const displayValue = typeof localValue === 'number' ? localValue.toFixed(decimals) : localValue;

  return (
    <div className="gui-row">
      <span>{label}</span>
      <input
        type="range"
        className="gui-slider"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={handleSliderChange}
      />
      <input
        ref={inputRef}
        type="text"
        className="gui-input-number"
        value={displayValue}
        onChange={handleInputChange}
        onBlur={handleInputBlur}
        onMouseDown={handleMouseDown}
      />
    </div>
  );
};

export default Slider;