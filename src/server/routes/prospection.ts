import { Router } from 'express';
import { crud } from './_crud.js';

export const STATUTS = ['nouveau', 'contacte', 'interesse', 'converti', 'perdu'];

export default function(db: any) {
  return crud(db, {
    table: 'prospection',
    filters: ['statut'],
    validate: (b) => (b && b.statut !== undefined && !STATUTS.includes(b.statut) ? `statut invalide (${STATUTS.join(', ')})` : null),
  }, Router());
}
