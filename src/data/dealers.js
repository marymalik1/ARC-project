// Development seed rows. These use the same shape as `public.dealers` so the
// in-memory fallback repository behaves exactly like PostgreSQL.
export const initialDealerRows = [
  {
    code: 'D00123',
    name: 'Ali Traders',
    region: 'Lahore',
    zone: 'North Zone',
    territory: 'Lahore City',
    status: 'Active',
    created_on: '2025-05-18',
  },
  {
    code: 'D00124',
    name: 'Khan Associates',
    region: 'Karachi',
    zone: 'South Zone',
    territory: 'Karachi South',
    status: 'Active',
    created_on: '2025-05-18',
  },
  {
    code: 'D00125',
    name: 'Usman Enterprises',
    region: 'Islamabad',
    zone: 'Central Zone',
    territory: 'Islamabad East',
    status: 'Inactive',
    created_on: '2025-05-17',
  },
  {
    code: 'D00126',
    name: 'Raza Enterprises',
    region: 'Lahore',
    zone: 'North Zone',
    territory: 'Sheikhupura',
    status: 'Active',
    created_on: '2025-05-17',
  },
  {
    code: 'D00127',
    name: 'Bilal & Sons',
    region: 'Peshawar',
    zone: 'West Zone',
    territory: 'Peshawar City',
    status: 'Inactive',
    created_on: '2025-05-16',
  },
]
