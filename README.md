# HKU A2 queue simulator

Static browser app: no visitor login, backend, or data upload. Run by double-clicking `start.command` on macOS, or `python3 scripts/serve.py`. A local HTTP server is required for the analysis worker. `register.command` registers `~/.local/bin/comp1110-sim` without changing your shell profile. Run that path directly if `~/.local/bin` is not on PATH.

## Current assumptions

- Two independent arrival streams: left 120/min, right 80/min; 20 Hz Poisson increments.
- Four lifts per side, initially staggered. Round-trip cycles: truncated normal with means 40/200 seconds, standard deviations 4/20 seconds, lower bound 10 seconds.
- Five-second boarding window; boarding is recorded at closing. Each trip samples integer capacity C−4…C with normal-shaped weights centered at C−2 (standard deviation 1); capacity never falls below one. No A1 occupancy deduction.
- Route geometry follows the schematic in original image pixels. Default 0.025 m/pixel and walking speed 1.3 m/s are adjustable assumptions, not field measurements. Queue positions beyond image bounds are clipped.
- Recommendations compare walking plus time until boarding, excluding the subsequent ride. Full queue information is assumed; Bayesian occlusion and QRE are not implemented.

## Million-trial experiment

The button starts exactly 1,000,000 independent conditional route-choice trials in a Web Worker. It freezes the current replay time, right queue length, and eight lift departure schedules. Left queue length is sampled uniformly from 0 through a configurable maximum. Future arrivals before joining are Poisson; capacities and subsequent cycles use the same distributions as playback. New arrivals after joining are behind the tagged passenger (FCFS).

The plot shows P(left faster | visible left queue length) with 95% Wilson intervals, not the empirical distribution of naturally occurring queue lengths. Ties are counted separately. This is not one million full-duration animations. CSV exports include the seed, parameters, snapshot, sample counts, probabilities and mean travel-to-boarding times. Changing parameters requires rerunning the experiment.

## GitHub Pages

Double-click `publish.command` after installing the official GitHub CLI (`brew install gh`). It guides you through `gh auth login` if required, creates a new public `hku-a2-queue-simulation` repository, exports only webpage assets into an isolated `.publish-checkout`, and enables Pages on main. Visitors do not need accounts. Repository creation and publication require the publisher's authorization.

Alternative repository name: `bash publish.command another-repo-name`. Later runs update the same export checkout. The neighbouring course plans and reports are not published.

References: https://docs.github.com/en/rest/pages/pages and https://cli.github.com/manual/gh_repo_create.
