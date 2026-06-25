import mongoose from 'mongoose';
const { Schema } = mongoose;

const JournalLineSchema = new Schema(
  { accountId: { type: Schema.Types.ObjectId, ref: 'Account', required: true }, description: String, debit: { type: Number, default: 0 }, credit: { type: Number, default: 0 } },
  { _id: false },
);

const JournalSchema = new Schema(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    number: String,
    date: { type: Date, default: Date.now },
    narration: String,
    lines: [JournalLineSchema],
    total: { type: Number, default: 0 },
    source: { type: String, default: 'manual' },
  },
  { timestamps: true },
);

JournalSchema.pre('save', function (next) {
  const dr = this.lines.reduce((a, l) => a + (l.debit || 0), 0);
  const cr = this.lines.reduce((a, l) => a + (l.credit || 0), 0);
  if (Math.abs(dr - cr) > 0.001) return next(new Error('Journal not balanced'));
  this.total = dr;
  next();
});

export const Journal = mongoose.model('Journal', JournalSchema);
//*** End Patch