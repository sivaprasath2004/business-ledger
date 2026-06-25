import { crudRouter } from '../utils/crud.js';
import { Account } from '../models/Account.js';
export default crudRouter({ Model: Account, module: 'accounts', searchFields: ['name', 'code'] });
//*** End Patch