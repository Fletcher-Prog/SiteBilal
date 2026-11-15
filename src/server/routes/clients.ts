import { Router } from 'express';
import { crud } from './_crud.js';

export default function(db: any) {
  return crud(db, { table: 'clients', order: 't.nom ASC' });
}
