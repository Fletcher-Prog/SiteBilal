import { Router } from 'express';
import { crud } from './_crud.js';

export default function(db: any) {
  return crud(db, {
    table: 'ventes',
    listSql: 'SELECT t.*, v.model AS vitrine_nom, v.serial AS vitrine_serie FROM ventes t LEFT JOIN vitrines v ON v.id = t.vitrine_id',
    filters: ['vitrine_id'],
  }, Router());
}
