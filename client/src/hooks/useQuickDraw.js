import { useEffect, useRef, useState, useCallback } from 'react';
import * as tf from '@tensorflow/tfjs';

// Quick Draw 345-class labels (must match model output order)
// Source: https://raw.githubusercontent.com/googlecreativelab/quickdraw-dataset/master/categories.txt
export const QUICKDRAW_LABELS = [
  'aircraft carrier','airplane','alarm clock','ambulance','angel','animal migration','ant','anvil','apple',
  'arm','asparagus','axe','backpack','banana','bandage','barn','baseball','baseball bat','basket',
  'basketball','bat','bathtub','beach','bear','beard','bed','bee','belt','bench','bicycle',
  'binoculars','bird','birthday cake','blackberry','blueberry','book','boomerang','bottlecap','bowtie',
  'bracelet','brain','bread','bridge','broccoli','broom','bucket','bulldozer','bus','bush','butterfly',
  'cactus','cake','calculator','calendar','camel','camera','camouflage','campfire','candle','cannon',
  'canoe','car','carrot','castle','cat','ceiling fan','cello','cell phone','chair','chandelier',
  'church','circle','clarinet','clock','cloud','coffee cup','compass','computer','cookie','cooler',
  'couch','cow','crab','crayon','crocodile','crown','cruise ship','cup','diamond','dishwasher',
  'diving board','dog','dolphin','donut','door','dragon','dresser','drill','drums','duck','dumbbell',
  'ear','elbow','elephant','envelope','eraser','eye','eyeglasses','face','fan','feather','fence',
  'finger','fire hydrant','fireplace','firetruck','fish','flamingo','flashlight','flip flops','floor lamp',
  'flower','flying saucer','foot','fork','frog','frying pan','garden','garden hose','giraffe','goatee',
  'golf club','grapes','grass','guitar','hamburger','hammer','hand','harp','hat','headphones',
  'hedgehog','helicopter','helmet','hexagon','hockey puck','hockey stick','horse','hospital','hot air balloon',
  'hot dog','hot tub','hourglass','house','house plant','hurricane','ice cream','jacket','jail','kangaroo',
  'key','keyboard','knee','knife','ladder','lantern','laptop','leaf','leg','light bulb','lighthouse',
  'lightning','line','lion','lipstick','lobster','lollipop','mailbox','map','marker','matches',
  'megaphone','mermaid','microphone','microwave','monkey','moon','mosquito','motorbike','mountain',
  'mouse','moustache','mouth','mug','mushroom','nail','necklace','nose','ocean','octopus','onion',
  'oven','owl','paint can','paintbrush','palm tree','panda','pants','paper clip','parachute','parrot',
  'passport','peanut','pear','peas','pencil','penguin','piano','pickup truck','picture frame','pig',
  'pillow','pineapple','pizza','pliers','police car','pond','pool','popsicle','postcard','potato',
  'power outlet','purse','rabbit','raccoon','radio','rain','rainbow','rake','remote control','rhinoceros',
  'rifle','river','roller coaster','rollerskates','sailboat','sandwich','saw','saxophone','school bus',
  'scissors','scorpion','screwdriver','sea turtle','see saw','shark','sheep','shoe','shorts','shovel',
  'sink','skateboard','skull','skyscraper','sleeping bag','smiley face','snail','snake','snorkel',
  'snowflake','snowman','soccer ball','sock','speedboat','spider','spoon','spreadsheet','square','squiggle',
  'squirrel','stairs','star','steak','stereo','stethoscope','stitches','stop sign','stove','strawberry',
  'streetlight','string bean','submarine','suitcase','sun','swan','sweater','swing set','sword','syringe',
  'table','teapot','teddy-bear','telephone','television','tennis racquet','tent','The Eiffel Tower',
  'The Great Wall of China','The Mona Lisa','tiger','toaster','toe','toilet','tooth','toothbrush',
  'toothpaste','tornado','tractor','traffic light','train','tree','triangle','trombone','truck','trumpet',
  't-shirt','umbrella','underwear','van','vase','violin','washing machine','watermelon','waterslide',
  'whale','wheel','windmill','wine bottle','wine glass','wristwatch','yoga','zebra','zigzag'
];

// Hosted Quick Draw TF.js model (community-trained, 345 classes)
// Using nsfwjs-style hosted model — replace with your own if needed
const MODEL_URL = 'https://storage.googleapis.com/tfjs-models/tfjs/mobilenet_v1_0.25_224/model.json';

// We use a simpler approach: a lightweight CNN trained on Quick Draw
// This URL points to a real Quick Draw classifier
const QUICKDRAW_MODEL_URL =
  'https://raw.githubusercontent.com/zaidalyafeai/zaidalyafeai.github.io/master/sketcher/model/model.json';

export function useQuickDraw({ canvasRef, currentWord, isActive, onAIWin }) {
  const modelRef = useRef(null);
  const intervalRef = useRef(null);
  const [aiGuesses, setAiGuesses] = useState([]);
  const [modelReady, setModelReady] = useState(false);
  const [modelError, setModelError] = useState(false);
  const hasWonRef = useRef(false);

  // Load model once
  useEffect(() => {
    let cancelled = false;
    async function loadModel() {
      try {
        await tf.ready();
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
      // Preprocess: resize to 28x28, grayscale, invert, normalize
      const offscreen = document.createElement('canvas');
      offscreen.width = 28;
      offscreen.height = 28;
      const ctx = offscreen.getContext('2d');
      // Black background
      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, 28, 28);
      ctx.drawImage(canvas, 0, 0, 28, 28);

      const imageData = ctx.getImageData(0, 0, 28, 28);
      const data = imageData.data;

      // Convert to grayscale float32 tensor [1, 28, 28, 1]
      const input = tf.tidy(() => {
        const gray = new Float32Array(28 * 28);
        for (let i = 0; i < 28 * 28; i++) {
          const r = data[i * 4];
          const g = data[i * 4 + 1];
          const b = data[i * 4 + 2];
          // Grayscale luminance, already inverted (white stroke on black)
          gray[i] = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        }
        return tf.tensor4d(gray, [1, 28, 28, 1]);
      });

      const predictions = await modelRef.current.predict(input).data();
      input.dispose();

      // Get top 5
      const indexed = Array.from(predictions).map((p, i) => ({ label: QUICKDRAW_LABELS[i] || `class_${i}`, confidence: p }));
      indexed.sort((a, b) => b.confidence - a.confidence);
      const top5 = indexed.slice(0, 5);

      setAiGuesses(top5);

      // Check if AI wins
      if (!hasWonRef.current && top5[0].confidence >= 0.80) {
        const normalized = top5[0].label.toLowerCase().trim();
        const word = currentWord.toLowerCase().trim();
        if (normalized === word) {
          hasWonRef.current = true;
          onAIWin?.(top5[0].label);
        }
      }
    } catch (err) {
      console.error('Inference error:', err);
    }
  }, [canvasRef, currentWord, onAIWin]);

  // Start/stop inference loop
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
