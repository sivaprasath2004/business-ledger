import { crudRouter } from '../utils/crud.js';
import { BankAccount } from '../models/BankAccount.js';
export default crudRouter({ Model: BankAccount, module: 'bank', searchFields: ['name', 'bankName'] });
//*** End Patch