import mongoose from 'mongoose';
const { Schema } = mongoose;

const NoteSchema = new Schema(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    title: String,
    body: String,
    color: { type: String, default: 'yellow' },
    pinned: { type: Boolean, default: false },
    tags: [String],
    linkedTo: { type: Schema.Types.Mixed, default: null }, // { type: 'contact'|'invoice', id }
  },
  { timestamps: true },
);

export const Note = mongoose.model('Note', NoteSchema);
//*** End Patch