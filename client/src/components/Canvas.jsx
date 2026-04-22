import { useRef, useState, useEffect, useCallback } from 'react';

const COLORS = [
  '#000000', '#ffffff', '#ef4444', '#f97316', '#eab308',
  '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#92400e',
];
const SIZES = [3, 8, 16];
const MAX_UNDO = 20;

export default function Canvas({ canvasRef, socket, disabled }) {
  const [color, setColor] = useState('#000000');
  const [sizeIdx, setSizeIdx] = useState(0);
  const [tool, setTool] = useState('pen'); // 'pen' | 'eraser'
  const isDrawing = useRef(false);
  const currentStroke = useRef([]);
  const batchId = useRef(0);
  const undoStack = useRef([]); // array of ImageData snapshots
  const containerRef = useRef(null);

  const size = SIZES[sizeIdx];
  const actualColor = tool === 'eraser' ? '#ffffff' : color;

  // Resize canvas to fill container
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    function resize() {
      const { width, height } = container.getBoundingClientRect();
      // Save current content
      const imgData = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      ctx.putImageData(imgData, 0, 0);
    }

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);
    return () => ro.disconnect();
  }, [canvasRef]);

  function getPos(e) {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches?.[0] || e;
    return {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top,
    };
  }

  function saveSnapshot() {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const snap = ctx.getImageData(0, 0, canvas.width, canvas.height);
    undoStack.current.push(snap);
    if (undoStack.current.length > MAX_UNDO) undoStack.current.shift();
  }

  const startDraw = useCallback((e) => {
    if (disabled) return;
    e.preventDefault();
    isDrawing.current = true;
    batchId.current += 1;
    currentStroke.current = [];
    saveSnapshot();

    const pos = getPos(e);
    currentStroke.current.push(pos);

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    ctx.strokeStyle = actualColor;
    ctx.lineWidth = size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, [disabled, actualColor, size, canvasRef]);

  const draw = useCallback((e) => {
    if (!isDrawing.current || disabled) return;
    e.preventDefault();
    const pos = getPos(e);
    currentStroke.current.push(pos);

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const prev = currentStroke.current[currentStroke.current.length - 2];
    ctx.strokeStyle = actualColor;
    ctx.lineWidth = size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(prev.x, prev.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  }, [disabled, actualColor, size, canvasRef]);

  const endDraw = useCallback(() => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    if (currentStroke.current.length < 2) return;

    const stroke = {
      points: currentStroke.current,
      color: actualColor,
      size,
      batchId: batchId.current,
    };
    socket.emit('draw-stroke', stroke);
    currentStroke.current = [];
  }, [socket, actualColor, size]);

  function handleClear() {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    saveSnapshot();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    socket.emit('draw-clear');
  }

  function handleUndo() {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (undoStack.current.length === 0) return;
    const snap = undoStack.current.pop();
    ctx.putImageData(snap, 0, 0);
    socket.emit('draw-undo');
  }

  return (
    <div className="canvas-wrapper">
      {/* Toolbar */}
      <div className="toolbar">
        <button className="tool-btn tool-btn-clear" onClick={handleClear} title="Clear all">🗑️ Clear</button>
        <button className="tool-btn" onClick={handleUndo} title="Undo">↩️</button>

        <div className="toolbar-sep" />

        <button className={`tool-btn ${tool === 'pen' ? 'active' : ''}`} onClick={() => setTool('pen')} title="Pen">✏️</button>
        <button className={`tool-btn ${tool === 'eraser' ? 'active' : ''}`} onClick={() => setTool('eraser')} title="Eraser">🧹</button>

        <div className="toolbar-sep" />

        <div className="size-btns">
          {SIZES.map((s, i) => (
            <button key={s} className={`size-btn ${sizeIdx === i ? 'active' : ''}`} onClick={() => setSizeIdx(i)}>
              <span style={{ width: s, height: s, borderRadius: '50%', background: '#333', display: 'inline-block' }} />
            </button>
          ))}
        </div>

        <div className="toolbar-sep" />

        <div className="color-palette">
          {COLORS.map(c => (
            <button
              key={c}
              className={`color-swatch ${color === c && tool === 'pen' ? 'selected' : ''}`}
              style={{ backgroundColor: c, border: c === '#ffffff' ? '2px solid #ccc' : undefined }}
              onClick={() => { setColor(c); setTool('pen'); }}
            />
          ))}
        </div>
      </div>

      {/* Canvas */}
      <div ref={containerRef} className="canvas-container">
        <canvas
          ref={canvasRef}
          className="draw-canvas"
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
          style={{ cursor: tool === 'eraser' ? 'cell' : 'crosshair', touchAction: 'none' }}
        />
      </div>
    </div>
  );
}
