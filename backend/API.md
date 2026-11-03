# Simulation API v1

The frontend talks to a simulation service through one transport module,
`frontend/api-client.js`. The service runs in a browser Web Worker, so GitHub
Pages remains sufficient hosting. There is no HTTP application server or database.
The mathematical model is version 4; API version 1 is an independent protocol version.

## Ownership and dependency direction

- `backend/model-core.js`: NHPP arrivals, walking costs, Logit choice, lift events,
  queue conservation, replay and conditional sample aggregation.
- `backend/time-profile.js`: Hong Kong time-of-day arrival profile for the passenger advisor
  and the advisor's lift table (`LIFTS`), calibrated to the team's field measurements:
  direct 48 people/min, via A1 14.4 people/min, ~25/min lecture-time and ~50/min peak arrivals.
- `backend/advisor.js`: stay/switch estimates built on the same engine (see `advise`).
- `backend/simulation-service.js`: public operations, parameter validation and
  plain-data results; also usable directly from Node.js without the frontend.
- `backend/worker.js`: versioned message transport and cooperative collection chunks.
- `frontend/api-client.js`: the only frontend file that creates workers or knows
  their URL. Replacing this transport is the integration point for a future server.
- `frontend/app.js`, `frontend/batch-ui.js`: forms, playback and visualization.
- `frontend/user.html`, `frontend/user.js`: passenger advisor page (same API client).
- `frontend/map-geometry.js`: drawing interpolation using a layout returned by
  the service. It does not calculate choice probabilities or simulation costs.

Frontend → API client → worker adapter → simulation service → model core.
The backend never imports the frontend and never accesses the DOM or canvas.
The frontend never loads or accesses `QueueModel` or `Engine`.

## Public client methods

```js
const client = new SimulationAPI.Client();
const simulation = await client.generate(p);
const frame = simulation.frames[1200];
const decision = await client.inspect(p, frame, 'A');
const table = await client.collect(p, 1000000, progress => {
  console.log(progress.done, progress.total, progress.runs);
});
client.close();
```

Use a separate client for long-running collection so replay inspections can run
independently. `close()` terminates that client's worker and rejects its pending
requests. The UI guards request generations so cancelled/stale results cannot
replace current data. Errors reject promises with an English message.

### `generate(p)` → replay

Returns `{apiVersion, modelVersion, step, layout, frames}`.
`step` is seconds per frame (0.05). `layout` contains corridor `paths`, their
`lengths`, and `personSpacingPixels`, used for drawing only.

Each frame contains:

| Field | Meaning |
| --- | --- |
| `t` | Simulation time in seconds |
| `q: [left,right]` | People physically in each queue |
| `arrivals` | Cumulative arrivals at entries A and B |
| `selected`, `served`, `transit` | Counts by destination queue |
| `choice: [[A_left,A_right],[B_left,B_right]]` | Cumulative route choices |
| `wait` | Cumulative arrival-to-boarding seconds for boarded passengers |
| `prob` | Last left-choice probability at each origin |
| `lifts` | Two banks of lift states: `nextClose`, `period`, `loaded`, `capacity`, `trips` |

### `inspect(p, snapshot, side)` → decision

`side` is `'A'` (left local queue) or `'B'` (right local queue). Only `t`, `q`,
and `prob` from the snapshot cross the client boundary.
Returns `{details, leftProbability, entryRates, routes}`.

`details[left/right]` contains `walk`, `arrivalRate`, `positionLoss`, `capacity`,
`batches`, `interval`, `waiting`, `total`. Times are seconds; rates are
people/second. These are computed by the same function used inside the engine
and table collection. The frontend formats these values without recalculating
model formulas. `routes` contain drawing polylines and walking measurements.

### `collect(p, total, onProgress)` → conditional table

`total` is an integer from 1 to 1,000,000 paired snapshots.
Progress: `{done,total,runs}`. Final result:
`{apiVersion,modelVersion,done,total,runs,p,cells}`.
Each cell is `{side,window,m,n,sumLeft,sumRight,hist}`:

- `window`: zero-based time-bin index; `m`: observed local queue count.
- `n`: matching snapshot count.
- `hist`: object mapping other-queue counts to frequencies.
- `sumLeft`, `sumRight`: accumulated complete choice costs in seconds.

Divide sums by `n` to display conditional means; divide histogram counts by `n`
to display probabilities. No definite recommendation is shown below 30 matches.
No hidden live queue value is used for missing conditions.

### Passenger advisor methods (additive, API version 1)

```js
const layout = await client.layout();            // {paths, lengths, personSpacingPixels}
const period = await client.profile(Date.now()); // {clock, period, entryRates}
const advice = await client.advise({now: Date.now(), queue: 1, ahead: 30, speed: 1.3});
```

`now` is epoch milliseconds (converted to Hong Kong time) or `{weekday: 0=Sun..6, seconds}`
since Hong Kong midnight. `queue` is 0 (left/direct, Side A) or 1 (right/via A1, Side B);
`ahead` is the number of people in front of the user (0-400); `speed` is m/s (0.3-3).

The advisor simulates 100 seeded trajectories from 15 minutes before `now` with profile
arrivals (rate `[0,0]` plus per-entry `addBy` pulses), records paired queue lengths every
5 s within +-3 min of `now`, and keeps snapshots whose own queue holds the user's position
(`ahead` to `ahead + max(2, 15%)`). Those give `P(other queue | own queue, time)`. From up to
80 matching states the engine is cloned and both choices are simulated with real lift events:
stay at position `ahead`, or walk `0.45 m x (people passed + other queue)` at the user's speed
and join the other tail. Result fields: `recommendation` (`stay`/`switch`/`close`),
`pSwitchFaster`, `timeSaved`, `stay`/`switch` wait summaries `{n, mean, p10, median, p90}`
in seconds until boarding (switch also has `walk`), `otherQueue {hist, n, median, p05, p95}`,
`matches`, `branches`, `lowConfidence` (fewer than 30 exact matches; nearest snapshots
are used instead), `period` and `entryRates` (people/minute). Deterministic for the same
minute and inputs.

## Parameter object

All backend units are **seconds, metres and people/second**. UI values in minutes
and people/minute are converted when the frontend builds the parameter object.
Arrays use `[left/direct/PDF Q2, right/via A1/PDF Q1]`, except `rate`, which is
`[entry A, entry B]`, and `prob`, which stores each origin's probability of going left.

```js
const p = {
  seed: 'HKU-2026', duration: 2400,
  rate: [120/60, 80/60],
  pulses: [{start: 0, end: 600, add: 60/60}],
  walkModel: 'document', spacing: 0.45, speed: 1.3, scale: 0.025,
  beta: 0.05, cap: [20,20], cycle: [40,200], std: [4,20],
  lifts: 4, sample: 5, window: 300
};
```

Pulse windows are half-open `[start,end)` and apply to both entries. Repeating
surges are expanded into explicit windows before calling the service. Defaults
repeat every 3600 seconds; over a 2400-second run only the first surge occurs.
The service validates finite ranges, array sizes, walking modes, pulse windows
and integer capacities/lift counts before computing.

## Wire protocol

Request:
```json
{"apiVersion":1,"id":7,"method":"inspect","params":{"p":{},"snapshot":{},"side":"A"}}
```

Success: `{apiVersion:1,id:7,type:'result',result:...}`.
Progress: `{apiVersion:1,id:7,type:'progress',progress:{done,total,runs}}`.
Failure: `{apiVersion:1,id:7,type:'error',error:{code,message}}`.
Codes: `INVALID_REQUEST` for malformed/unsupported operations and
`SIMULATION_ERROR` for collection failures. IDs correlate concurrent requests.
An unsupported version is rejected. Requests and responses must be structured-
cloneable data; no DOM objects, callbacks or engine instances cross this boundary.

## Backend-only use and checks

```js
const service = require('./backend/simulation-service.js');
const result = service.generate(p);
const collection = service.createCollection(p, 1000);
while (collection.step().done < 1000) {}
const table = collection.result();
```

Run `node tests/model.test.js`, `node tests/api.test.js`, `node tests/advisor.test.js`, and
`node tests/worker-benchmark.js 1000000` from the project root. The API tests
verify that the worker produces the exact same seeded replay, decisions and
conditional table as the direct backend, and rejects invalid requests.
