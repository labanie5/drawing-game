// Curated subset of Quick Draw 345 categories
// These must match the labels used by the TF.js Quick Draw model
const WORDS = [
  // Animals
  'cat', 'dog', 'fish', 'bird', 'rabbit', 'elephant', 'lion', 'tiger',
  'bear', 'horse', 'cow', 'pig', 'sheep', 'duck', 'frog', 'snake',
  'monkey', 'penguin', 'owl', 'butterfly', 'crab', 'octopus', 'shark',
  'whale', 'giraffe', 'zebra', 'crocodile', 'rhinoceros', 'hedgehog',
  // Fruits & Food
  'apple', 'banana', 'strawberry', 'watermelon', 'pineapple', 'grapes',
  'pizza', 'hamburger', 'hot dog', 'cake', 'cookie', 'donut', 'bread',
  'ice cream', 'lollipop', 'peas', 'carrot', 'broccoli', 'mushroom',
  // Vehicles
  'car', 'bus', 'bicycle', 'airplane', 'boat', 'train', 'truck',
  'motorcycle', 'helicopter', 'ambulance', 'fire truck', 'sailboat',
  // Objects & Items
  'chair', 'table', 'clock', 'telephone', 'television', 'computer',
  'book', 'pencil', 'scissors', 'key', 'lamp', 'umbrella', 'hat',
  'shoe', 'sock', 'glasses', 'camera', 'guitar', 'drum', 'piano',
  'hammer', 'saw', 'shovel', 'axe', 'knife', 'fork', 'spoon', 'cup',
  'bottle', 'bucket', 'backpack', 'suitcase', 'tent',
  // Nature
  'tree', 'flower', 'sun', 'moon', 'star', 'cloud', 'mountain',
  'rainbow', 'leaf', 'cactus', 'palm tree', 'mushroom',
  // Buildings & Places
  'house', 'castle', 'bridge', 'lighthouse', 'hospital',
  // Body & People
  'eye', 'ear', 'nose', 'mouth', 'hand', 'foot', 'face',
  // Misc
  'soccer ball', 'basketball', 'baseball', 'tennis racquet', 'crown',
  'diamond', 'heart', 'star', 'arrow', 'flag',
];

function getRandomWords(count, exclude = []) {
  const available = WORDS.filter(w => !exclude.includes(w));
  const shuffled = available.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function getRandomWord(exclude = []) {
  return getRandomWords(1, exclude)[0];
}

module.exports = { WORDS, getRandomWord, getRandomWords };
