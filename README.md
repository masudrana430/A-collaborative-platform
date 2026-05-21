# DevPulse API

DevPulse is an internal tech issue and feature tracker API for software teams. It allows users to register, log in, report bugs, suggest feature requests, view issues, and manage issue workflows based on role permissions.

## Live URL

Coming soon

## GitHub Repository

Coming soon

## Features

- User registration and login
- JWT-based authentication
- Password hashing with bcrypt
- Contributor and maintainer roles
- Create bug reports and feature requests
- View all issues
- View single issue details
- Filter issues by type and status
- Sort issues by newest or oldest
- Contributor issue update permissions
- Maintainer issue update and delete permissions
- Maintainer-only system metrics
- PostgreSQL database using native pg driver
- Raw SQL queries only

## Tech Stack

- Node.js
- TypeScript
- Express.js
- PostgreSQL
- pg
- bcrypt
- jsonwebtoken
- cors
- dotenv
- http-status-codes

## Environment Variables

Create a `.env` file in the root directory and add:

```env
PORT=5000
DATABASE_URL=your_postgresql_connection_string
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=1d
BCRYPT_SALT_ROUNDS=10