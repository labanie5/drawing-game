import { useEffect, useRef } from 'react';

export default function ViewCanvas({ canvasRef }) {
  const containerRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    function resize() {
      const { width, height } = container.getBoundingClientRect();
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
    }

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);
    return () => ro.disconnect();
  }, [canvasRef]);

  return (
    <div className="canvas-wrapper">
      <div className="toolbar view-toolbar">
        <span className="view-label">Watching the drawing...</span>
      </div>
      <div ref={containerRef} className="canvas-container">
        <canvas ref={canvasRef} className="draw-canvas" />
      </div>
    </div>
  );
}
