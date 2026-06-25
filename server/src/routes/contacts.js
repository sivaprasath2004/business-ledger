import { crudRouter } from '../utils/crud.js';
import { Contact } from '../models/Contact.js';
export default crudRouter({
  Model: Contact,
  module: 'contacts',
  searchFields: ['displayName', 'businessName', 'email', 'phone', 'taxNumber'],
});
//*** End Patch