import { Router } from 'express';
import { crud } from './_crud.js';

export default function(db: any) {
  return crud(db, {
    table: 'lieux',
    listSql: 'SELECT t.*, (SELECT COUNT(*) FROM vitrines v WHERE v.lieu_id = t.id) AS nb_vitrines FROM lieux t',
  }, Router());
}
