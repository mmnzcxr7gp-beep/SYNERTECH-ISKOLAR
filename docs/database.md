# DATABASE SCHEMAS & DATA MODEL DOCUMENTATION

**System**: Synertech ISKOLAR Scholarship Application System  
**Database**: MongoDB Atlas / Mongoose ORM + In-Memory `db.data` Persistence Layer  

---

## 1. Mongoose Models Overview

| Model | Collection Name | Key Fields & Primary Identifiers |
|---|---|---|
| **User** | `users` | `_id`, `email`, `passwordHash`, `role`, `accountStatus`, `mfaEnabled`, `emailVerifiedAt` |
| **Student** | `students` | `userId` (Number/Mixed), `email`, `schoolName`, `lrn`, `gradeLevel`, `verificationStatus`, `isVerified`, `documents`, `paymentMethods` |
| **Provider** | `providers` | `userId` (Number/Mixed), `organizationName`, `organizationType`, `isVerified`, `contactPerson` |
| **Scholarship** | `scholarships` | `providerId`, `title`, `description`, `type`, `totalSlots`, `approvedCount`, `applicationDeadline`, `status`, `allowance`, `maxAmount` |
| **ScholarshipApplication** | `scholarshipapplications` | `scholarshipId`, `studentId`, `status`, `submittedAt`, `documents`, `rankingScore` |
| **Notification** | `notifications` | `userId` (Number), `title`, `message`, `type`, `read`, `data` |
| **Schedule** | `schedules` | `scholarshipId`, `providerId`, `type` (`exam`/`interview`), `title`, `date`, `venue`, `assignedStudents` |
| **AuditLog** | `auditlogs` | `actorUserId` (Mixed), `actorRole`, `action`, `targetType`, `targetId`, `beforeSummary`, `afterSummary`, `ip` |
| **ConsentRecord** | `consentrecords` | `userId` (Mixed), `policyVersion`, `consentType`, `accepted`, `acceptedAt`, `ip` |

---

## 2. Shared In-Memory DB Structure (`db.data`)

The `db.js` layer initializes and persists an in-memory JSON state object stored as a single document in MongoDB Atlas:

```json
{
  "users": [ ... ],
  "student_profiles": [ ... ],
  "scholarships": [ ... ],
  "applications": [ ... ],
  "documents": [ ... ],
  "otps": [ ... ],
  "device_tokens": [ ... ],
  "notifications": [ ... ],
  "schedules": [ ... ]
}
```

---

## 3. Key Relationships & Primary Keys

- **User ↔ Student/Provider**: `user.id` (Numeric ID or ObjectId) maps 1-to-1 to `student.userId` / `provider.userId`.
- **Scholarship ↔ Provider**: `scholarship.sponsor_id` or `providerId` maps to the provider's `userId`.
- **Application ↔ Scholarship**: `application.scholarship_id` references `scholarship.id`.
- **Application ↔ Student**: `application.student_id` references `user.id`.
- **Document ↔ Application**: `document.application_id` references `application.id`.
