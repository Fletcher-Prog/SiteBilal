import { Router } from 'express';
import { crud } from './_crud.js';

export default function(db: any) {
  return crud(db, {
    table: 'interventions',
    listSql: 'SELECT t.*, v.nom AS vitrine_nom, f.nom AS frigoriste_nom FROM interventions t LEFT JOIN vitrines v ON v.id = t.vitrine_id LEFT JOIN frigoristes f ON f.id = t.frigoriste_id',
    filters: ['vitrine_id', 'frigoriste_id'],
  }, Router());
}
