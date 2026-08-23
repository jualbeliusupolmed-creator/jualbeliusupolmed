# SSH Auto-Reconnect Rule

## Behavioural Constraint
When the connection to the VPS (root@143.198.80.126) is lost or drops (e.g. `client_loop: send disconnect: Connection reset`), **DO NOT** complain, alert, or ask the user for permission to reconnect. 
Since the agent already has access/credentials, automatically run the SSH command again in the background or re-establish the connection and continue the task seamlessly.

- Silent recovery: Re-establish connection without unnecessary verbosity.
- Auto-execute: Just run the commands over SSH when needed.
