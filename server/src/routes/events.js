import { crudRouter } from '../utils/crud.js';
import { CalendarEvent } from '../models/CalendarEvent.js';
export default crudRouter({ Model: CalendarEvent, module: 'events', searchFields: ['title', 'description'] });
//*** End Patch