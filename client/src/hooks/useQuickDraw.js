import { useEffect, useRef, useState, useCallback } from 'react';
import * as tf from '@tensorflow/tfjs';

// Self-hosted model in /public/model/ — always available
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

  // Load model + class names once on mount
  useEffect(() => {
    let cancelled = false;
    async function loadModel() {
      try {
        await tf.ready();

        // Load class names from self-hosted text file
        const res = await fetch(CLASS_NAMES_URL);
        const text = await res.text();
        labelsRef.current = text.trim().split('\n').map(l => l.trim());

        // Load the Quick Draw CNN model
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
    if (!modelRef.current || !canvasRef.current || !currentWord) return;

    const canvas = canvasRef.current;
    if (canvas.width === 0 || canvas.height === 0) return;

    try {
      // Resize canvas to 28x28, white strokes on black background
      const offscreen = document.createElement('canvas');
      offscreen.width = 28;
      offscreen.height = 28;
      const ctx = offscreen.getContext('2d');
      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, 28, 28);
      ctx.drawImage(canvas, 0, 0, 28, 28);

      const imageData = ctx.getImageData(0, 0, 28, 28);
      const data = imageData.data;

      // Build [1, 28, 28, 1] grayscale tensor, invert colors
      const input = tf.tidy(() => {
        const gray = new Float32Array(28 * 28);
        for (let i = 0; i < 28 * 28; i++) {
          const r = data[i * 4];
          const g = data[i * 4 + 1];
          const b = data[i * 4 + 2];
          // Invert: canvas is white bg/dark strokes → model expects black bg/white strokes
          gray[i] = 1 - (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        }
        return tf.tensor4d(gray, [1, 28, 28, 1]);
      });

      const predictions = await modelRef.current.predict(input).data();
      input.dispose();

      // Map to labels and sort by confidence
      const indexed = Array.from(predictions).map((confidence, i) => ({
        label: labelsRef.current[i] || `class_${i}`,
        confidence,
      }));
      indexed.sort((a, b) => b.confidence - a.confidence);
      const top5 = indexed.slice(0, 5);

      setAiGuesses(top5);

      // AI wins if top guess matches the word with high confidence
      if (!hasWonRef.current && top5[0].confidence >= 0.80) {
        const guessed = top5[0].label.toLowerCase().trim();
        const word = currentWord.toLowerCase().trim();
        if (guessed === word) {
          hasWonRef.current = true;
          onAIWin?.(top5[0].label);
        }
      }
    } catch (err) {
      console.error('Inference error:', err);
    }
  }, [canvasRef, currentWord, onAIWin]);

  // Start/stop inference loop when round is active
  useEffect(() => {
    if (!isActive || !modelReady) {
      clearInterval(intervalRef.current);
      return;
    }
    hasWonRef.current = false;
    setAiGuesses([]);
    intervalRef.current = setInterval(runInference, 2000);
    return () => clearInterval(intervalRef.current);
  }, [isActive, modelReady, runInference]);

  return { aiGuesses, modelReady, modelError };
}
