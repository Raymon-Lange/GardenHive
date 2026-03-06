const mongoose = require('mongoose');

const gardenSchema = new mongoose.Schema(
  {
    userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name:         { type: String, required: true, trim: true },
    gardenWidth:  { type: Number, min: 1, default: null },
    gardenHeight: { type: Number, min: 1, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Garden', gardenSchema);
