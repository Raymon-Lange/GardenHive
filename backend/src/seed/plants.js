require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const Plant = require('../models/Plant');

const PLANTS = [
  // Vegetables
  { name: 'Tomato (Large)', category: 'vegetable', perSqFt: 1, daysToHarvest: 70, emoji: '🍅', description: 'Large beefsteak or heirloom tomatoes. 1 per sq ft.' },
  { name: 'Tomato (Cherry)', category: 'vegetable', perSqFt: 1, daysToHarvest: 60, emoji: '🍅', description: 'Cherry or grape tomatoes. Prolific producer.' },
  { name: 'Zucchini', category: 'vegetable', perSqFt: 1, daysToHarvest: 50, emoji: '🥒', description: 'Summer squash. Takes up 1 sq ft but sprawls.' },
  { name: 'Cucumber', category: 'vegetable', perSqFt: 2, daysToHarvest: 55, emoji: '🥒', description: 'Train vertically on a trellis. 2 per sq ft.' },
  { name: 'Bell Pepper', category: 'vegetable', perSqFt: 1, daysToHarvest: 75, emoji: '🫑', description: 'Sweet peppers. 1 per sq ft.' },
  { name: 'Hot Pepper', category: 'vegetable', perSqFt: 1, daysToHarvest: 80, emoji: '🌶️', description: 'Jalapeño, cayenne, or other hot peppers.' },
  { name: 'Eggplant', category: 'vegetable', perSqFt: 1, daysToHarvest: 80, emoji: '🍆', description: 'One plant per sq ft. Loves heat.' },
  { name: 'Kale', category: 'vegetable', perSqFt: 1, daysToHarvest: 55, emoji: '🥬', description: 'Hardy green. Harvest outer leaves continuously.' },
  { name: 'Lettuce', category: 'vegetable', perSqFt: 4, daysToHarvest: 30, emoji: '🥬', description: 'Cut-and-come-again. 4 per sq ft.' },
  { name: 'Spinach', category: 'vegetable', perSqFt: 9, daysToHarvest: 40, emoji: '🥬', description: '9 plants per sq ft. Cool-season crop.' },
  { name: 'Arugula', category: 'vegetable', perSqFt: 4, daysToHarvest: 35, emoji: '🥬', description: 'Fast growing peppery green.' },
  { name: 'Swiss Chard', category: 'vegetable', perSqFt: 4, daysToHarvest: 55, emoji: '🥬', description: 'Colorful stems, nutritious leaves. 4 per sq ft.' },
  { name: 'Carrot', category: 'vegetable', perSqFt: 16, daysToHarvest: 70, emoji: '🥕', description: '16 per sq ft in deep, loose soil.' },
  { name: 'Radish', category: 'vegetable', perSqFt: 16, daysToHarvest: 25, emoji: '🔴', description: 'Quick crop. Great for filling gaps.' },
  { name: 'Beet', category: 'vegetable', perSqFt: 9, daysToHarvest: 60, emoji: '🟣', description: 'Eat both roots and greens. 9 per sq ft.' },
  { name: 'Broccoli', category: 'vegetable', perSqFt: 1, daysToHarvest: 80, emoji: '🥦', description: '1 per sq ft. Harvest head, then side shoots.' },
  { name: 'Cauliflower', category: 'vegetable', perSqFt: 1, daysToHarvest: 85, emoji: '⬜', description: '1 per sq ft. Needs consistent moisture.' },
  { name: 'Green Bean (Bush)', category: 'vegetable', perSqFt: 9, daysToHarvest: 55, emoji: '🟢', description: 'Bush beans. 9 per sq ft, no staking needed.' },
  { name: 'Pea (Snap)', category: 'vegetable', perSqFt: 8, daysToHarvest: 65, emoji: '🫛', description: 'Train on trellis. Sweet and crisp.' },
  { name: 'Onion', category: 'vegetable', perSqFt: 4, daysToHarvest: 90, emoji: '🧅', description: '4 bulbing onions per sq ft.' },
  { name: 'Garlic', category: 'vegetable', perSqFt: 9, daysToHarvest: 240, emoji: '🧄', description: 'Plant in fall, harvest in summer.' },
  { name: 'Potato', category: 'vegetable', perSqFt: 1, daysToHarvest: 90, emoji: '🥔', description: '1 seed potato per sq ft in hilled rows.' },
  // Fruits
  { name: 'Strawberry', category: 'fruit', perSqFt: 4, daysToHarvest: 60, emoji: '🍓', description: '4 per sq ft. Runners fill space over time.' },
  { name: 'Watermelon', category: 'fruit', perSqFt: 1, daysToHarvest: 80, emoji: '🍉', description: 'Needs 1 sq ft but trains long vines outward.' },
  { name: 'Cantaloupe', category: 'fruit', perSqFt: 1, daysToHarvest: 75, emoji: '🍈', description: 'Train vines on trellis for vertical growing.' },
  // Herbs
  { name: 'Basil', category: 'herb', perSqFt: 4, daysToHarvest: 25, emoji: '🌿', description: 'Plant near tomatoes. Pinch flowers to keep producing.' },
  { name: 'Parsley', category: 'herb', perSqFt: 4, daysToHarvest: 75, emoji: '🌿', description: 'Biennial. Curly or flat-leaf varieties.' },
  { name: 'Cilantro', category: 'herb', perSqFt: 4, daysToHarvest: 45, emoji: '🌿', description: 'Bolt in heat. Succession plant every 2-3 weeks.' },
  { name: 'Chives', category: 'herb', perSqFt: 16, daysToHarvest: 30, emoji: '🌿', description: 'Perennial. Cut often to encourage growth.' },
  { name: 'Dill', category: 'herb', perSqFt: 4, daysToHarvest: 40, emoji: '🌿', description: 'Attracts beneficial insects. Harvest fronds or seeds.' },
];

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  const existing = await Plant.countDocuments();
  if (existing > 0) {
    console.log(`Plant library already has ${existing} plants. Skipping seed.`);
    console.log('Run with --force to re-seed: node src/seed/plants.js --force');
    if (!process.argv.includes('--force')) {
      await mongoose.disconnect();
      return;
    }
    await Plant.deleteMany({});
    console.log('Cleared existing plants.');
  }

  await Plant.insertMany(PLANTS);
  console.log(`Seeded ${PLANTS.length} plants to the library.`);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
