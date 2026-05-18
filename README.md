# HospitalCare Calendar Automation API

A Node.js application with MySQL and Sequelize using MVC pattern for hospital calendar automation with JWT authentication.

## Features

- **MVC Architecture**: Clean separation of concerns
- **MySQL Database**: Using Sequelize ORM
- **JWT Authentication**: Secure token-based authentication
- **PM2 Support**: Production process management
- **CI/CD Pipeline**: GitHub Actions for automated deployment

## Project Structure

```
├── config/
│   └── database.js          # Database configuration
├── controllers/
│   └── loginController.js   # Login logic with JWT
├── middleware/
│   └── authMiddleware.js    # JWT authentication middleware
├── models/
│   ├── index.js            # Model exports
│   └── organogram.js       # Organogram model
├── routes/
│   ├── index.js            # Route aggregator
│   └── loginRoutes.js      # Login routes
├── .env                    # Environment variables
├── .gitignore
├── package.json
├── ecosystem.config.js     # PM2 configuration
└── server.js               # Entry point
```

## Installation

```bash
npm install
```

## Configuration

Copy `.env.example` to `.env` and update the following variables:

```env
# Database Configuration
DB_HOST=your_database_host
DB_USER=your_database_user
DB_PASSWORD=your_database_password
DB_NAME=your_database_name

# JWT Configuration
JWT_SECRET=your_jwt_secret_key

# Server Configuration
PORT=12000
```

## Running the Application

### Development
```bash
npm run dev
```

### Production with PM2
```bash
# Start the application
pm2 start ecosystem.config.js

# List running processes
pm2 list

# View logs
pm2 logs

# Stop the application
pm2 stop hospitalcare-calendar-automation

# Restart the application
pm2 restart hospitalcare-calendar-automation
```

## API Endpoints

### Base URL: `/hospitalcare/calendar/automation`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/login` | Login (user with email/sap_code OR admin with username/password) |
| GET | `/verify` | Verify JWT token (protected) |

### User Login Request

```json
POST /hospitalcare/calendar/automation/login
Content-Type: application/json

{
  "email": "ama.bdm.chandigarh@alembic.co.in",
  "sap_code": "111367"
}
```

### Admin Login Request

```json
POST /hospitalcare/calendar/automation/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}
```

### Login Response

```json
{
  "success": true,
  "message": "Login successful",
  "token": "jwt_token_here",
  "user": {
    "id": 1,
    "emp_code": "EMP001",
    "emp_name": "John Doe",
    "hq": "Headquarters",
    "level": "Manager",
    "region": "North",
    "status": "Active",
    "division": "Cardiology",
    "sap_code": "SAP123",
    "mobileno": "1234567890",
    "emailid": "john@example.com",
    "doj": "2023-01-15",
    "am_sapcode": "AM001",
    "rm_sapcode": "RM001",
    "zm_sapcode": "ZM001",
    "type": "user"
  }
}
```

**Note:** The `type` field indicates the login type:
- `"type": "user"` - Regular user login
- `"type": "admin"` - Admin login

## CI/CD Pipeline

The project uses GitHub Actions for automated deployment. Configure the following secrets in your GitHub repository:

- `HOST`: Server IP address
- `USERNAME`: SSH username
- `SSH_KEY`: SSH private key
- `APP_NAME`: Application name for PM2

## Postman Collection

Import the Postman collection from `postman/HospitalCare_Calendar_Automation.postman_collection.json` to test the API endpoints.

**Collection Structure:**
- **Authentication**: Login (User), Login (Admin), Verify Token
- **System**: Test Database Connection

**Note:** The token is saved to collection variables. After running Login, the token will be available for subsequent requests.

## Database Model

The `organogram` table includes the following fields:

| Field | Type |
|-------|------|
| id | BIGINT (Primary Key) |
| emp_code | INTEGER |
| emp_name | VARCHAR(32) |
| hq | VARCHAR(15) |
| level | VARCHAR(24) |
| region | VARCHAR(21) |
| status | VARCHAR(13) |
| division | VARCHAR(23) |
| sap_code | INTEGER |
| mobileno | VARCHAR(10) |
| emailid | VARCHAR(35) |
| doj | VARCHAR(9) |
| am_sapcode | INTEGER |
| rm_sapcode | INTEGER |
| zm_sapcode | INTEGER |
| created_at | TIMESTAMP |
| updated_at | TIMESTAMP |