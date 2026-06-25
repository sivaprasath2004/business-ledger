import { crudRouter } from '../utils/crud.js';
import { Note } from '../models/Note.js';
export default crudRouter({ Model: Note, module: 'notes', searchFields: ['title', 'body'] });
//*** End Patch