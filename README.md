# chingchiehwang-arcade-api

Hono + MongoDB backend for Battleship. Logged-in requests send `Authorization: Bearer <token>`. Errors return `{ "error": "message" }`.

| Method | Endpoint | Description | Body | Success | Errors |
|---|---|---|---|---|---|
| POST | `/api/auth/signup` | Create an account | `{ email, password }` | 201 `{ user, token }` | 400, 409 |
| POST | `/api/auth/login` | Log in | `{ email, password }` | 200 `{ user, token }` | 400, 401 |
| POST | `/api/auth/logout` | Log out | | 200 | 401 |
| GET | `/api/auth/me` | Current user | | 200 `{ user }` | 401 |
| GET | `/api/games` | Waiting games and my games | | 200 `{ waiting, mine }` | |
| POST | `/api/games` | Create a game | | 201 `{ game }` | 401 |
| GET | `/api/games/:id` | One game, opponent's unsunk ships hidden | | 200 `{ game }` | 400, 401, 403, 404 |
| POST | `/api/games/:id/players` | Join a waiting game | | 201 `{ game }` | 400, 401, 404, 409 |
| POST | `/api/games/:id/shots` | Fire at the opponent's grid | `{ x, y }` | 201 `{ result }` | 400, 401, 403, 404, 409 |
