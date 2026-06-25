// Default permission templates for built-in roles.
const ALL_MODULES = ['contacts','items','invoices','bills','expenses','bank','accounts','journals','reports','notes','events','excel','users','roles','settings'];
const ALL_ACTIONS = ['view','create','edit','delete','export','import','approve'];

function full() {
  const p = {};
  for (const m of ALL_MODULES) {
    p[m] = {};
    for (const a of ALL_ACTIONS) p[m][a] = 'all';
  }
  return p;
}
function viewer() {
  const p = {};
  for (const m of ALL_MODULES) p[m] = { view: 'all', export: true };
  return p;
}
function staff() {
  const p = full();
  p.users = { view: 'all' };
  p.roles = { view: 'all' };
  p.settings = { view: 'all' };
  return p;
}
function sales() {
  const p = viewer();
  p.contacts = { view: 'all', create: true, edit: 'own', export: true, import: true };
  p.invoices = { view: 'all', create: true, edit: 'own', export: true };
  p.items = { view: 'all' };
  return p;
}
function accountant() {
  const p = staff();
  p.users = { view: 'all' };
  return p;
}

export const BUILTIN_ROLES = [
  { name: 'Admin', description: 'Full access', builtin: true, permissions: full() },
  { name: 'Staff', description: 'All modules, no user/role mgmt', builtin: true, permissions: staff() },
  { name: 'Accountant', description: 'Books + reports', builtin: true, permissions: accountant() },
  { name: 'Sales', description: 'Quotes, invoices, customers', builtin: true, permissions: sales() },
  { name: 'Viewer', description: 'Read-only', builtin: true, permissions: viewer() },
];

export { ALL_MODULES, ALL_ACTIONS };
//*** End Patch