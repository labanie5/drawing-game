import { useEffect, useRef, useState, useCallback } from 'react';
import * as tf from '@tensorflow/tfjs';

const QUICKDRAW_MODEL_URL = '/model/model.json';
const CLASS_NAMES_URL = '/model/class_names.txt';

export function useQuickDraw({ canvasRef, currentWord, isActive, onAIWin }) {
  const modelRef = useRef(null);
  const labelsRef = useRef([]);
  const intervalRef = useRef(null);
  const [aiGuesses, setAiGuesses] = useState([]);
  const [modelReady, setModelReady] = useState(false);
  const [modelError, setModelError] = useState(false);
  const hasWonRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    async function loadModel() {
      try {
        await tf.ready();
        const res = await fetch(CLASS_NAMES_URL);
        const text = await res.text();
        labelsRef.current = text.trim().split('\n').map(l => l.trim());
        const model = await tf.loadLayersModel(QUICKDRAW_MODEL_URL);
        if (!cancelled) {
          modelRef.current = model;
          setModelReady(true);
        }
      } catch (err) {
        console.error('Failed to load Quick Draw model:', err);
        if (!cancelled) setModelError(true);
      }
    }
    loadModel();
    return () => { cancelled = true; };
  }, []);

  const runInference = useCallback(async () => {
    // Run inference even without currentWord — just won't trigger AI win
    if (!modelRef.current || !canvasRef?.current) return;

    const canvas = canvasRef.current;
    if (!canvas.width || !canvas.height) return;

    try {
      const offscreen = document.createElement('canvas');
      offscreen.width = 28;
      offscreen.height = 28;
      const ctx = offscreen.getContext('2d');

      // Black background, then draw the canvas on top
      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, 28, 28);
      ctx.drawImage(canvas, 0, 0, 28, 28);

      const imageData = ctx.getImageData(0, 0, 28, 28);
      const data = imageData.data;

      // Check if canvas has any actual drawing (not just white background)
      let hasContent = false;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i] < 240 || data[i + 1] < 240 || data[i + 2] < 240) {
          hasContent = true;
          break;
        }
      }
      if (!hasContent) return; // Nothing drawn yet

      const input = tf.tidy(() => {
        const gray = new Float32Array(28 * 28);
        for (let i = 0; i < 28 * 28; i++) {
          const r = data[i * 4];
          const g = data[i * 4 + 1];
          const b = data[i * 4 + 2];
          // Invert: white bg → black, dark strokes → white (Quick Draw format)
          gray[i] = 1 - (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        }
        return tf.tensor4d(gray, [1, 28, 28, 1]);
      });

      const predTensor = modelRef.current.predict(input);
      const predictions = await predTensor.data();
      input.dispose();
      predTensor.dispose();

      const indexed = Array.from(predictions).map((confidence, i) => ({
        label: labelsRef.current[i] || `class_${i}`,
        confidence,
      }));
      indexed.sort((a, b) => b.confidence - a.confidence);
      const top5 = indexed.slice(0, 5);

      setAiGuesses(top5);

      // Only trigger AI win if we know the word (drawer's device)
      if (currentWord && onAIWin && !hasWonRef.current) {
        const word = currentWord.toLowerCase().trim();
        const match = top5.find(
          g => g.label.toLowerCase().trim() === word && g.confidence >= 0.3
        );
        if (match) {
          hasWonRef.current = true;
          onAIWin(match.label);
        }
      }
    } catch (err) {
      console.error('Inference error:', err);
    }
  }, [canvasRef, currentWord, onAIWin]);

  useEffect(() => {
    if (!isActive || !modelReady) {
      clearInterval(intervalRef.current);
      return;
    }
    hasWonRef.current = false;
    setAiGuesses([]);
    // Run immediately then every 500ms
    runInference();
    intervalRef.current = setInterval(runInference, 500);
    return () => clearInterval(intervalRef.current);
  }, [isActive, modelReady, runInference]);

  return { aiGuesses, modelReady, modelError };
}
