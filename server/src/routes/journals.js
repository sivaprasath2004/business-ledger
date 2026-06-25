import { crudRouter } from '../utils/crud.js';
import { Journal } from '../models/Journal.js';
export default crudRouter({ Model: Journal, module: 'journals', searchFields: ['number', 'narration'] });
//*** End Patch