# Runtime server logs

Inspect server output when pages throw at runtime, Payload hooks crash, or background compilation fails.

## Where logs live

The dev script routes stdout and stderr through `scripts/run-with-log.ts` into `.data/logs/`.

- Current run: `.data/logs/dev-latest.log`
- Historical runs: `.data/logs/dev-<timestamp>-<pid>.log`

Runs stay on disk for 24 hours. The runner prunes older runs automatically when a new task starts.

## How to read logs

Read the tail of the current run with the `read` tool:

```
read path=".data/logs/dev-latest.log:-100"
```

Search for runtime errors or uncaught exceptions with `grep`:

```
grep pattern="error|unhandled|fatal|failed" path=".data/logs/dev-latest.log"
```

## Log properties

- Plain text. The runner strips ANSI color escape codes before writing to disk. Stack traces and error messages match plain string searches.
- Stream mode. Turborepo runs with `ui: "stream"` so each task prefixes lines cleanly without terminal redraw sequences.
- Concurrent safety. Each server invocation writes to its own timestamped file. Sibling worktrees or parallel tasks do not overwrite each other.
