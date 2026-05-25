# CRM360 API Documentation

## Base URL
```
http://localhost:3000/api/v1
```

## Authentication
All protected routes require a JWT token via httpOnly cookie. The server automatically handles token storage and retrieval.

**Note:** For cross-origin requests (e.g., from a frontend on a different domain), include `credentials: true` in your fetch/axios config.

**Fallback:** The server also accepts tokens in the Authorization header for backward compatibility:
```
Authorization: Bearer <token>
```

## Endpoints

---

### Auth

#### POST /auth/signup
Register a new user. New users are created as admins and must verify their email before logging in.

**Request Body:**
```json
{
  "email": "string",
  "password": "string",
  "full_name": "string"
}
```

**Response (201):**
```json
{
  "status": true,
  "message": "User registered successfully. Check your email for a verification code.",
  "data": {
    "user": { "id", "email", "display_name", "role", "is_active", "created_at" }
  }
}
```

**Note:** No auth cookie is set until the email is verified.

---

#### POST /auth/verify-email
Verify a new user's email with the OTP sent during signup. A successful verification logs the user in.

**Request Body:**
```json
{
  "email": "string",
  "otp": "string"
}
```

**Response (200):**
```json
{
  "status": true,
  "message": "Email verified successfully",
  "data": {
    "user": { "id", "email", "display_name", "avatar_url", "role", "created_at" }
  }
}
```

**Note:** Token is set via cookie automatically.

---

#### POST /auth/resend-verification-email
Resend the signup verification OTP for an unverified account.

**Request Body:**
```json
{
  "email": "string"
}
```

**Response (200):**
```json
{
  "status": true,
  "message": "Verification code sent to your email"
}
```

**Response (429):**
```json
{
  "status": false,
  "message": "Too many verification codes requested. Please try again later."
}
```

---

#### GET /auth/google
Get Google OAuth authorization URL for social login.

**Response (200):**
```json
{
  "status": true,
  "message": "Auth URL generated successfully",
  "data": {
    "url": "https://accounts.google.com/oauth2/..."
  }
}
```

---

#### GET /auth/google/callback
Handle Google OAuth callback. Redirects to frontend with token.

---

#### POST /auth/login
Login with email and password.

**Request Body:**
```json
{
  "email": "string",
  "password": "string"
}
```

**Response (200):**
```json
{
  "status": true,
  "message": "Login successful",
  "data": {
    "user": { "id", "email", "display_name", "avatar_url", "role", "created_at" }
  }
}
```

**Note:** Token is set via httpOnly cookie automatically.

---

#### GET /auth/me
Get current user profile. **Requires auth.**

**Response (200):**
```json
{
  "status": true,
  "message": "User profile retrieved successfully",
  "data": { "id", "email", "display_name", "avatar_url", "role", "created_at" }
}
```

---

#### PATCH /auth/me
Update current user profile. **Requires auth.**

**Request Body:**
```json
{
  "display_name": "string",
  "avatar_url": "string"
}
```

---

#### POST /auth/forgot-password
Request a password reset OTP. An OTP code is sent to the user's email.

**Request Body:**
```json
{
  "email": "string"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "message": "OTP sent to your email"
  }
}
```

---

#### POST /auth/verify-otp
Verify the OTP code sent to the user's email.

**Request Body:**
```json
{
  "email": "string",
  "otp": "string"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "message": "OTP verified successfully"
  }
}
```

---

#### POST /auth/reset-password
Reset the user's password after OTP verification.

**Request Body:**
```json
{
  "email": "string",
  "otp": "string",
  "new_password": "string"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "message": "Password reset successfully"
  }
}
```

---

#### POST /auth/logout
Logout and clear the auth cookie. **Requires auth.**

**Response (200):**
```json
{
  "status": true,
  "message": "Logged out successfully"
}
```

---

### Users (Admin Only)

All user routes require admin role.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /users | List all users |
| GET | /users/:id | Get user by ID |
| POST | /users | Create user |
| DELETE | /users/:id | Deactivate user |
| GET | /users/:id/role | Get user role |
| POST | /users/:id/role | Assign role to user |
| DELETE | /users/:id/role | Remove user role |

#### GET /users
Query parameters:
- `page` (default: 1)
- `limit` (default: 20)
- `search` - Search by email or name

**Response:**
```json
{
  "success": true,
  "data": [...],
  "total": 10,
  "page": 1,
  "limit": 20,
  "total_pages": 1
}
```

---

#### POST /users
Create a new user.

**Request Body:**
```json
{
  "email": "string",
  "password": "string",
  "display_name": "string",
  "role": "admin | sales_manager | sales_rep | viewer"
}
```

---

#### POST /users/:id/role
Assign a role to a user.

**Request Body:**
```json
{
  "role": "admin | sales_manager | sales_rep | viewer"
}
```

**Response:**
```json
{
  "status": true,
  "message": "Role assigned successfully",
  "data": {
    "user_id": "string",
    "role": "string",
    "assigned_at": "datetime"
  }
}
```

---

### Contacts

All contact routes require authentication.

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | /contacts | List contacts | All roles |
| GET | /contacts/:id | Get contact | All roles |
| POST | /contacts | Create contact | admin, sales_manager, sales_rep |
| PATCH | /contacts/:id | Update contact | admin, sales_manager, sales_rep |
| DELETE | /contacts/:id | Delete contact | admin, sales_manager |
| GET | /contacts/export | Export contacts | admin, sales_manager |
| POST | /contacts/bulk-import | Bulk import | admin, sales_manager, sales_rep |
| GET | /contacts/:id/activities | Get activities | All roles |
| GET | /contacts/:id/deals | Get deals | All roles |
| GET | /contacts/:id/tasks | Get tasks | All roles |
| GET | /contacts/:id/documents | Get documents | All roles |

#### GET /contacts
Query parameters:
- `page` (default: 1)
- `limit` (default: 20)
- `search` - Search by name, email, phone
- `company_id` - Filter by company
- `owner_id` - Filter by owner
- `temperature` - Filter by temperature (hot, warm, cold)
- `tags` - Filter by tags (comma-separated)

**Response:**
```json
{
  "status": true,
  "message": "Contacts retrieved successfully",
  "data": [...],
  "total": 100,
  "page": 1,
  "limit": 20,
  "total_pages": 5
}
```

---

#### POST /contacts
**Request Body:**
```json
{
  "first_name": "string",
  "last_name": "string",
  "email": "string",
  "phone": "string",
  "role_title": "string",
  "company_id": "string",
  "temperature": "hot | warm | cold",
  "tags": ["string"]
}
```

---

#### GET /contacts/export
Export contacts as CSV or JSON. **Requires admin or sales_manager role.**

Query parameters:
- `format` - Export format: `csv` (default) or `json`

**Response:** Downloads a file with all contacts.

CSV columns:
```
first_name, last_name, email, phone, role_title, company, industry, website, temperature, tags, owner_email, owner_name, last_contacted_at, created_at
```

---

#### POST /contacts/bulk-import
Import multiple contacts from a spreadsheet array.

**Request Body:**
```json
{
  "contacts": [
    {
      "first_name": "string",
      "last_name": "string",
      "email": "string",
      "phone": "string",
      "role_title": "string",
      "company_id": "string",
      "temperature": "hot | warm | cold",
      "tags": ["string"]
    }
  ]
}
```

--- 

### Companies

All company routes require authentication.

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | /companies | List companies | All roles |
| GET | /companies/export | Export companies | admin, sales_manager |
| GET | /companies/:id | Get company | All roles |
| POST | /companies | Create company | admin, sales_manager, sales_rep |
| PATCH | /companies/:id | Update company | admin, sales_manager, sales_rep |
| DELETE | /companies/:id | Delete company | admin, sales_manager |
| GET | /companies/:id/contacts | Get company contacts | All roles |
| GET | /companies/:id/deals | Get company deals | All roles |
| GET | /companies/:id/stats | Get company stats | All roles |

#### GET /companies
Query parameters:
- `page` (default: 1)
- `limit` (default: 20)
- `search` - Search by name, industry, website
- `owner_id` - Filter by owner
- `industry` - Filter by industry

**Response:**
```json
{
  "status": true,
  "message": "Companies retrieved successfully",
  "data": [
    {
      "_id": "string",
      "name": "string",
      "industry": "string",
      "website": "string",
      "email": "string",
      "phone": "string",
      "address": "string",
      "contact_person": "string",
      "notes": "string",
      "owner_id": { "email": "string", "display_name": "string" },
      "created_at": "datetime",
      "updated_at": "datetime",
      "stats": {
        "contact_count": 0,
        "deal_count": 0,
        "pipeline_value": 0,
        "won_revenue": 0
      }
    }
  ],
  "total": 50,
  "page": 1,
  "limit": 20,
  "total_pages": 3
}
```

Each company returned by `GET /companies`, `GET /companies/:id`, `POST /companies`, and `PATCH /companies/:id` includes `stats`, so clients do not need to call `/companies/:id/contacts`, `/companies/:id/deals`, or `/companies/:id/stats` just to show company summary counts.

---

#### POST /companies
**Request Body:**
```json
{
  "name": "string",
  "industry": "string",
  "website": "string",
  "notes": "string",
  "contact_person": "string",
  "email": "string",
  "phone": "string",
  "address": "string"
}
```

---

#### PATCH /companies/:id
**Request Body:**
```json
{
  "name": "string",
  "industry": "string",
  "website": "string",
  "notes": "string",
  "contact_person": "string",
  "email": "string",
  "phone": "string",
  "address": "string"
}

```

---

#### GET /companies/export
Export companies as CSV or JSON. **Requires admin or sales_manager role.**

Query parameters:
- `format` - Export format: `csv` (default) or `json`

**Response:** Downloads a file with all companies.

CSV columns:
```
name, industry, website, email, phone, address, contact_person, notes, owner_email, owner_name, created_at
```

---

### Deals

All deal routes require authentication.

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | /deals | List deals | All roles |
| GET | /deals/:id | Get deal | All roles |
| POST | /deals | Create deal | admin, sales_manager, sales_rep |
| PATCH | /deals/:id | Update deal | admin, sales_manager, sales_rep |
| DELETE | /deals/:id | Delete deal | admin, sales_manager |
| GET | /deals/:id/activities | Get deal activities | All roles |
| GET | /deals/:id/tasks | Get deal tasks | All roles |
| GET | /deals/:id/stats | Get deal stats | All roles |
| POST | /deals/:id/stage | Update deal stage | admin, sales_manager, sales_rep |
| POST | /deals/bulk-stage | Bulk update stage | admin, sales_manager |

#### GET /deals
Query parameters:
- `page` (default: 1)
- `limit` (default: 20)
- `search` - Search by title
- `company_id` - Filter by company
- `owner_id` - Filter by owner
- `stage_id` - Filter by pipeline stage
- `status` - Filter by status (open, won, lost)

---

#### POST /deals
**Request Body:**
```json
{
  "title": "string",
  "value": "number",
  "currency": "string",
  "expected_close_date": "datetime",
  "stage_id": "string",
  "source": "string",
  "industry": "string",
  "company_id": "string",
  "contact_id": "string"
}
```

---

#### POST /deals/:id/stage
**Request Body:**
```json
{
  "stage_id": "string"
}
```

---

### Tasks

All task routes require authentication.

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | /tasks | List tasks | All roles |
| GET | /tasks/my | Get my tasks | All roles |
| GET | /tasks/upcoming | Get upcoming tasks | All roles |
| GET | /tasks/:id | Get task | All roles |
| POST | /tasks | Create task | admin, sales_manager, sales_rep |
| PATCH | /tasks/:id | Update task | admin, sales_manager, sales_rep |
| DELETE | /tasks/:id | Delete task | admin, sales_manager |
| POST | /tasks/:id/complete | Complete task | admin, sales_manager, sales_rep |

#### GET /tasks
Query parameters:
- `page` (default: 1)
- `limit` (default: 20)
- `search` - Search by title, description
- `status` - Filter by status (pending, in_progress, completed, cancelled)
- `priority` - Filter by priority (low, medium, high, urgent)
- `type` - Filter by type (task, meeting, call, follow_up)
- `owner_id` - Filter by owner
- `assignee_id` - Filter by assignee
- `contact_id` - Filter by contact
- `deal_id` - Filter by deal

---

#### POST /tasks
**Request Body:**
```json
{
  "title": "string",
  "type": "task | meeting | call | follow_up",
  "priority": "low | medium | high | urgent",
  "status": "pending | in_progress | completed | cancelled",
  "description": "string",
  "due_at": "datetime",
  "duration_minutes": "number",
  "location": "string",
  "meeting_url": "string",
  "contact_id": "string",
  "deal_id": "string",
  "company_id": "string",
  "assignees": ["user_id"]
}
```

---

### Pipelines

All pipeline routes require authentication.

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | /pipelines | List pipelines | All roles |
| GET | /pipelines/board | Get pipeline board | All roles |
| GET | /pipelines/:id | Get pipeline | All roles |
| POST | /pipelines | Create pipeline | admin only |
| PATCH | /pipelines/:id | Update pipeline | admin only |
| DELETE | /pipelines/:id | Delete pipeline | admin only |
| GET | /pipelines/stages/all | List stages | All roles |
| GET | /pipelines/stages/:id | Get stage | All roles |
| POST | /pipelines/stages | Create stage | admin only |
| PATCH | /pipelines/stages/:id | Update stage | admin only |
| DELETE | /pipelines/stages/:id | Delete stage | admin only |
| POST | /pipelines/stages/reorder | Reorder stages | admin only |

#### GET /pipelines/board
Query parameters:
- `pipeline_id` (required)

**Response:**
```json
{
  "status": true,
  "message": "Pipeline board retrieved successfully",
  "data": [
    {
      "stage": { "id", "name", "order", "is_won", "is_lost", "assignees": [...] },
      "deals": [...],
      "stats": { "deal_count", "total_value" }
    }
  ]
}
```

---

#### POST /pipelines
**Request Body:**
```json
{
  "name": "string",
  "description": "string",
  "is_default": "boolean"
}
```

---

#### POST /pipelines/stages
**Request Body:**
```json
{
  "name": "string",
  "description": "string",
  "pipeline_id": "string",
  "order": "number",
  "is_won": "boolean",
  "is_lost": "boolean",
  "assignees": ["user_id"]
}
```

---

#### PATCH /pipelines/stages/:id
**Request Body:**
```json
{
  "name": "string",
  "description": "string",
  "order": "number",
  "is_won": "boolean",
  "is_lost": "boolean",
  "assignees": ["user_id"]
}
```

---

### Default Pipeline Stages

When the server starts, a default pipeline with the following stages is automatically created:

| Order | Name | Description |
|-------|------|-------------|
| 1 | Lead | Initial lead stage |
| 2 | Qualified | Lead has been qualified |
| 3 | Proposal | Proposal sent |
| 4 | Negotiation | In negotiation phase |
| 5 | Won | Deal won |
| 6 | Lost | Deal lost |

Each stage can have assignees assigned to it to track who is responsible for deals at that stage.

---

### Activities

All activity routes require authentication.

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | /activities | List activities | All roles |
| GET | /activities/:id | Get activity | All roles |

---

### User Roles

| Role | Permissions |
|------|-------------|
| admin | Full access, manage users & roles |
| sales_manager | Create, edit, delete all contacts |
| sales_rep | Create, edit, delete own contacts |
| viewer | View only |

---

## Error Responses

```json
{
  "status": false,
  "message": "Error message"
}
```

**Common HTTP Status Codes:**
- `401` - Invalid or missing token
- `403` - Insufficient permissions
- `404` - Resource not found
- `400` - Invalid input
- `500` - Server error
