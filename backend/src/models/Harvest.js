const mongoose = require('mongoose');

const harvestSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    plantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Plant', required: true },
    bedId: { type: mongoose.Schema.Types.ObjectId, ref: 'GardenBed', default: null },
    quantity: { type: Number, required: true, min: 0 },
    unit: {
      type: String,
      enum: ['lbs', 'oz', 'kg', 'g', 'count'],
      required: true,
    },
    harvestedAt: { type: Date, default: Date.now },
    season: { type: String }, // e.g. "Spring 2026", derived from harvestedAt
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

// Auto-derive season from harvestedAt before save
harvestSchema.pre('save', function () {
  const d = this.harvestedAt || new Date();
  const month = d.getMonth(); // 0-based
  const year = d.getFullYear();
  let seasonName;
  if (month >= 2 && month <= 4) seasonName = 'Spring';
  else if (month >= 5 && month <= 7) seasonName = 'Summer';
  else if (month >= 8 && month <= 10) seasonName = 'Fall';
  else seasonName = 'Winter';
  this.season = `${seasonName} ${year}`;
});

module.exports = mongoose.model('Harvest', harvestSchema);
