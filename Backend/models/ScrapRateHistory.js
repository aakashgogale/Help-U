const mongoose = require('mongoose');

// One row per rate change of a scrap type, so the admin can see how a rate moved
const scrapRateHistorySchema = new mongoose.Schema({
  scrapTypeId: { type: mongoose.Schema.Types.ObjectId, ref: 'ScrapType', required: true, index: true },
  rate: { type: Number, required: true, min: 0 },
  previousRate: { type: Number, default: null },
  changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null }
}, { timestamps: { createdAt: true, updatedAt: false } });

module.exports = mongoose.model('ScrapRateHistory', scrapRateHistorySchema);
