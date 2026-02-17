const mongoose = require('mongoose');

const cellSchema = new mongoose.Schema(
  {
    row: { type: Number, required: true },
    col: { type: Number, required: true },
    plantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Plant', default: null },
  },
  { _id: false }
);

const gardenBedSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    rows: { type: Number, required: true, min: 1, max: 50 },
    cols: { type: Number, required: true, min: 1, max: 50 },
    cells: [cellSchema],
    // Top-left position in the overall garden map (sq ft grid)
    mapRow: { type: Number, default: null },
    mapCol: { type: Number, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('GardenBed', gardenBedSchema);
