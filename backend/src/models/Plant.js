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
    daysToGermination: { type: Number },
    spacingIn: { type: Number },   // planting spacing in inches
    depthIn: { type: Number },     // planting depth in inches
    description: { type: String },
    emoji: { type: String, default: '🌱' },
    // null = system plant; ObjectId = user who created it
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Plant', plantSchema);
