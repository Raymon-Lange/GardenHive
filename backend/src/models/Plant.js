const mongoose = require('mongoose');

const plantSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ['vegetable', 'fruit', 'herb', 'flower'],
      default: 'vegetable',
    },
    // How many plants fit in 1 sq ft (square foot gardening spacing)
    perSqFt: { type: Number, default: 1 },
    daysToHarvest: { type: Number },
    description: { type: String },
    emoji: { type: String, default: '🌱' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Plant', plantSchema);
