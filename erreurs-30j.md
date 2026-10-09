# Journal d'erreurs — 7 sur 30 jours
(2 motifs distincts, export du 06/10/2026 22:20 UTC)

## 4× — RuntimeError sur /execute/positions
- personnes touchées : 1
- première : 24/09 16:34 · dernière : 24/09 16:37
- GET /execute/positions → HTTP 200 (réf. 19F3F7)
- action précédente : GET /execute/pending, il y a 10 s

```
MetaApi positions 500: {"id":660090,"error":"Error","message":"Failed to execute a callable"}

Traceback (most recent call last):
  File "/app/backend/app/routers/execute.py", line 627, in list_positions
    fetched[futs[f]] = f.result()
                       ^^^^^^^^^^
  File "/usr/local/lib/python3.12/concurrent/futures/_base.py", line 449, in result
    return self.__get_result()
           ^^^^^^^^^^^^^^^^^^^
  File "/usr/local/lib/python3.12/concurrent/futures/_base.py", line 401, in __get_result
    raise self._exception
  File "/usr/local/lib/python3.12/concurrent/futures/thread.py", line 59, in run
    result = self.fn(*self.args, **self.kwargs)
             ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/app/backend/worker/execute_order.py", line 1591, in fetch_account_positions
    raise RuntimeError(f"MetaApi positions {r.status_code}: {r.text[:120]}")
RuntimeError: MetaApi positions 500: {"id":660090,"error":"Error","message":"Failed to execute a callable"}
```

## 3× — RuntimeError sur /execute/pending
- personnes touchées : 1
- première : 24/09 16:34 · dernière : 06/10 11:20
- GET /execute/pending → HTTP 200 (réf. 5A50F5)
- action précédente : GET /accounts, il y a 6 s

```
MetaApi ordres 500: {"id":695923,"error":"Error","message":"Failed to execute a callable"}

Traceback (most recent call last):
  File "/app/backend/app/routers/execute.py", line 558, in list_pending
    ordres += [{**o, "account_id": aid, "alias": by_id[aid].alias} for o in f.result()]
                                                                            ^^^^^^^^^^
  File "/usr/local/lib/python3.12/concurrent/futures/_base.py", line 449, in result
    return self.__get_result()
           ^^^^^^^^^^^^^^^^^^^
  File "/usr/local/lib/python3.12/concurrent/futures/_base.py", line 401, in __get_result
    raise self._exception
  File "/usr/local/lib/python3.12/concurrent/futures/thread.py", line 59, in run
    result = self.fn(*self.args, **self.kwargs)
             ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/app/backend/worker/execute_order.py", line 1655, in fetch_account_orders
    raise RuntimeError(f"MetaApi ordres {r.status_code}: {r.text[:120]}")
RuntimeError: MetaApi ordres 500: {"id":695923,"error":"Error","message":"Failed to execute a callable"}
```
