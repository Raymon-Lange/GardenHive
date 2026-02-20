const mongoose = require('mongoose');

const gardenAccessSchema = new mongoose.Schema(
  {
    ownerId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    granteeEmail: { type: String, required: true, lowercase: true, trim: true },
    granteeId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    permission:   { type: String, enum: ['analytics', 'harvests_analytics', 'full'], required: true },
    status:       { type: String, enum: ['pending', 'active'], default: 'pending' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('GardenAccess', gardenAccessSchema);
