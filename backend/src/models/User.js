const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['owner', 'helper'], default: 'owner' },
    active: { type: Boolean, default: true },
    hiddenPlants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Plant' }],
    gardenName:   { type: String, trim: true },
    gardenImage:  { type: String },
    gardenWidth:  { type: Number, min: 1, default: null },
    gardenHeight: { type: Number, min: 1, default: null },
  },
  { timestamps: true }
);

userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

module.exports = mongoose.model('User', userSchema);
