# GCDL Management System - Backend API

A comprehensive backend API for managing grain and cereal distribution and logistics operations, built with Node.js, Express.js, and MySQL.

## Features

- **User Authentication & Authorization**: JWT-based authentication with role-based access control (CEO, Manager, Sales Agent)
- **Branch Management**: Multi-branch support with branch-specific data isolation
- **Stock Management**: Real-time stock tracking and low stock alerts
- **Procurement Tracking**: Record and manage produce procurement from dealers
- **Sales Management**: Track sales transactions (cash and credit)
- **Credit Management**: Monitor credit sales, payments, and overdue accounts
- **Analytics & Reports**: Comprehensive analytics and reporting capabilities

## Tech Stack

- **Runtime**: Node.js (v14+)
- **Framework**: Express.js
- **Database**: MySQL (v8.0+)
- **Authentication**: JWT (JSON Web Tokens)
- **Password Hashing**: bcryptjs
- **Validation**: express-validator

### Required Modules

Make sure the following core modules are installed (already defined in `package.json`):

- `express`
- `mysql2`
- `dotenv`
- `jsonwebtoken`

## Project Structure

```
mILCK/
├── config/
│   └── database.js          # Database connection configuration
├── controllers/
│   ├── authController.js    # Authentication logic
│   ├── procurementController.js
│   ├── salesController.js
│   ├── stockController.js
│   ├── creditController.js
│   ├── analyticsController.js
│   └── branchController.js
├── middleware/
│   ├── auth.js              # JWT authentication middleware
│   └── validation.js        # Request validation middleware
├── routes/
│   ├── auth.js
│   ├── procurement.js
│   ├── sales.js
│   ├── stock.js
│   ├── credit.js
│   ├── analytics.js
│   ├── reports.js
│   └── branches.js
├── database_schema.sql      # Database schema
├── server.js                # Main application entry point
├── package.json
├── .env.example
└── README.md
```

## Installation & Setup

### Prerequisites

- Node.js (v14 or higher)
- MySQL (v8.0 or higher)
- npm or yarn

### Step 1: Install Dependencies

```bash
cd mILCK
npm install
```

### Step 2: Database Setup

1. **Create MySQL Database**:
   ```bash
   mysql -u root -p
   ```

2. **Run SQL commands**:
   ```sql
   CREATE DATABASE gcdl_db;
   CREATE USER 'gcdl_user'@'localhost' IDENTIFIED BY 'secure_password';
   GRANT ALL PRIVILEGES ON gcdl_db.* TO 'gcdl_user'@'localhost';
   FLUSH PRIVILEGES;
   EXIT;
   ```

3. **Import Schema**:
   ```bash
   mysql -u root -p gcdl_db < database_schema.sql
   ```

### Step 3: Environment Configuration

1. **Create `.env` file** (copy from `.env.example`):
   ```bash
   cp .env.example .env
   ```

2. **Update `.env` with your configuration**:
```env
PORT=3000
NODE_ENV=development

DB_HOST=localhost
DB_PORT=3306
DB_USER=devops
DB_PASSWORD=
DB_NAME=bsit_post

JWT_SECRET=mysecretekey
JWT_EXPIRE=1h
SECRET_KEY=mysecretekey

CORS_ORIGIN=http://localhost:3000
```

### Step 4: Run the Server

**Development mode** (with auto-reload):
```bash
npm run dev
```

**Production mode**:
```bash
npm start
```

The server will start on `http://localhost:5000`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user (protected)
- `POST /login` - Simple login that returns JWT using username/password
- `GET /users` - Fetch all users (requires Bearer token from `/login`)

### Branches
- `GET /api/branches` - Get all branches
- `GET /api/branches/:id` - Get branch by ID
- `POST /api/branches` - Create branch (CEO only)
- `PUT /api/branches/:id` - Update branch (CEO only)
- `DELETE /api/branches/:id` - Delete branch (CEO only)

### Stock/Produce
- `GET /api/stock` - Get all stock
- `GET /api/stock/alerts` - Get low stock alerts
- `GET /api/stock/:id` - Get stock by ID
- `POST /api/stock` - Create produce (Manager/CEO)
- `PUT /api/stock/:id` - Update stock (Manager/CEO)
- `DELETE /api/stock/:id` - Delete stock (CEO only)

### Procurement
- `GET /api/procurement` - Get all procurements
- `GET /api/procurement/:id` - Get procurement by ID
- `POST /api/procurement` - Create procurement
- `PUT /api/procurement/:id` - Update procurement (Manager/CEO)
- `DELETE /api/procurement/:id` - Delete procurement (CEO only)

### Sales
- `GET /api/sales` - Get all sales
- `GET /api/sales/:id` - Get sale by ID
- `POST /api/sales` - Create sale
- `PUT /api/sales/:id` - Update sale (Manager/CEO)
- `DELETE /api/sales/:id` - Delete sale (CEO only)

### Credit Sales
- `GET /api/credit` - Get all credit sales
- `GET /api/credit/stats` - Get credit statistics
- `GET /api/credit/:id` - Get credit by ID
- `PUT /api/credit/:id/payment` - Update credit payment (Manager/CEO)

### Analytics
- `GET /api/analytics/dashboard` - Get dashboard analytics
- `GET /api/analytics/sales` - Get sales analytics
- `GET /api/analytics/procurement` - Get procurement analytics

### Reports
- `GET /api/reports/sales` - Generate sales report
- `GET /api/reports/procurement` - Generate procurement report
- `GET /api/reports/stock` - Generate stock report
- `GET /api/reports/credit` - Generate credit report

## Authentication

All protected routes require a JWT token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

## Role-Based Access Control

- **CEO**: Full access to all branches and all operations
- **Manager**: Access to their branch only, can create/update most records
- **Sales Agent**: Access to their branch only, can create sales and procurement records

## Database Schema

The system includes the following main entities:

1. **Users**: System users with roles (CEO, Manager, Sales Agent)
2. **Branches**: Company branches/locations
3. **Produce**: Products/commodities (Beans, Maize, etc.)
4. **Procurement**: Purchase records from dealers
5. **Sales**: Sales transactions
6. **Credit Sales**: Credit payment tracking

## Error Handling

The API returns standardized error responses:

```json
{
  "message": "Error description",
  "errors": [] // For validation errors
}
```

Status codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

## Development

### Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon

### Testing

Test the API using tools like:
- Postman
- cURL
- Thunder Client (VS Code extension)

Example login request:
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'
```

## Security Notes

- Never commit `.env` file to version control
- Use strong JWT secrets (minimum 32 characters)
- Use strong database passwords
- Enable HTTPS in production
- Regularly update dependencies

## License

ISC

## Support

For issues and questions, please contact the development team.



