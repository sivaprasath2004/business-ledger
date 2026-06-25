import { crudRouter } from '../utils/crud.js';
import { Expense } from '../models/Expense.js';
export default crudRouter({ Model: Expense, module: 'expenses', searchFields: ['description', 'category'] });
//*** End Patch