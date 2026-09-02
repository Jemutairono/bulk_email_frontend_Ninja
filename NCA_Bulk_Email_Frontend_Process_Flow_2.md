# NCA Bulk Email as a Service — Front-End Process Flow

**Scope:** Browser console only.  
**Frontend stack assumption:** React + TypeScript.  
**Backend/infrastructure:** Consumed through authenticated APIs; not implemented by the frontend.

> **Status:** Message Log (§14), standalone Reports (§13), a Roles/Permissions matrix under
> Administration (§16), and System Status (§21) were flagged in an earlier review as scope
> beyond the original 12-module requirements doc. All four have since been implemented in the
> reference build (`nca-bulk-email-frontend.zip`) and are reflected as final below.

---

## 1. Authentication Flow

```text
User opens NCA Bulk Email Portal
        ↓
Login
        ↓
Enter username/email + password
        ↓
MFA required?
   ┌────┴────┐
   │         │
  Yes        No
   ↓         ↓
Enter MFA   Continue
code
   ↓
Authentication successful
        ↓
Load user profile + RBAC permissions
        ↓
Create authenticated session
        ↓
Check session validity
        ↓
Load appropriate dashboard
```

### Authentication failure

```text
Login attempt
    ↓
Invalid credentials/MFA
    ↓
Display error
    ↓
Allow retry
```

### Session expiry

```text
Active session
    ↓
Inactivity timeout
    ↓
Invalidate session
    ↓
Redirect to Login
    ↓
Authenticate again
```

---

## 2. Main Application Flow

```text
                                    Dashboard
                                        │
   ┌────────────┬─────────────┬────────┴────────┬──────────────────────┐
   ↓            ↓             ↓                 ↓                      ↓
Campaigns    Audience      Insight         Administration
   │            │             │                 │
   │            │             │                 │
Campaign     Contacts &    Analytics      Quota & Alerts
 Studio        Lists          │           User Administration
   │            │           Reports       Roles & Permissions
Scheduler    Consent          │           Audit Log
   │          Centre       Message Log    System Status
Deliverability  │
 Testing      Data
              Hygiene
```

This mirrors the sidebar in the reference build: five nav groups (Campaigns, Audience, Insight,
Administration, plus Dashboard on its own) — every item is reachable directly from the sidebar,
none require passing through another module first. Consent is grouped under Audience alongside
Contacts, since both act on the same contact record. System Status sits under Administration but
is visible to every role, unlike the other items in that group (see §16, §21).

The user's RBAC permissions determine which modules and actions are visible.

---

## 3. Dashboard Flow

```text
Login
  ↓
Dashboard
  ↓
Fetch dashboard data from API
  ↓
Display:
  ├── Emails sent
  ├── Delivery rate
  ├── Opens
  ├── Clicks
  ├── Bounces
  ├── Unsubscribes
  ├── Complaints
  ├── Quota consumption
  └── Recent campaigns/events
```

### Dashboard filtering

```text
Dashboard
   ↓
User selects date range/filter
   ↓
Frontend sends query to API
   ↓
API returns aggregated data
   ↓
Frontend updates charts/tables
```

---

## 4. Campaign Creation Flow

```text
Campaigns
   ↓
Create Campaign
   ↓
Campaign information
   ├── Campaign name
   ├── Sender
   ├── Subject
   └── Sending identity
   ↓
Select template
   ↓
Campaign Studio
   ↓
Drag-and-drop content
   ↓
Edit text/images
   ↓
Insert personalization fields
   ↓
Configure dynamic/conditional content
   ↓
Select audience
   ↓
Configure A/B testing?
   ├── No → Continue
   └── Yes
         ↓
     Configure variants
         ↓
     Continue
   ↓
Save draft
```

---

## 5. Audience Selection Flow

```text
Campaign
   ↓
Select Audience
   ↓
Choose:
   ├── Mailing list
   ├── Multiple lists
   ├── Saved segment
   └── Dynamic criteria
   ↓
Apply filters
   ↓
Display estimated recipient count
   ↓
Check suppression/consent status
   ↓
Valid recipients available?
   ├── No → Display error / modify audience
   └── Yes
         ↓
     Confirm audience
```

---

## 6. Campaign Pre-Flight Flow

```text
Campaign ready
    ↓
Run pre-send validation
    ↓
┌────────────────────────────┐
│ Validation checks           │
├────────────────────────────┤
│ ✓ Recipients                │
│ ✓ Consent/suppression       │
│ ✓ Sender configuration      │
│ ✓ Spam score                │
│ ✓ Deliverability            │
│ ✓ Inbox placement           │
│ ✓ Device rendering          │
│ ✓ Email-client rendering    │
└────────────────────────────┘
    ↓
Problems?
   ┌────┴────┐
   │         │
  Yes        No
   ↓         ↓
Fix issues  Continue
   ↓         ↓
Re-run      Schedule/Send
validation
```

---

## 7. Scheduling / Sending Flow

```text
Validated campaign
       ↓
Choose sending mode
       ↓
 ┌──────────────┬───────────────────┐
 │              │
Send now     Schedule
 │           date/time
 │              │
 └──────────────┘
                ↓
          Confirmation
                ↓
       Submit campaign to API
                ↓
       Backend accepts request
                ↓
       Campaign status = Queued
                ↓
       Frontend monitors status
```

**Triggered sends are not a manual choice in this screen.** A triggered send originates from an
external NCA application calling the platform's API directly (e.g. a registration system firing
a welcome email) — the console never asks a user to pick "Triggered" as a sending mode. Triggered
campaigns still appear in Campaign Monitoring (§8) and Message Log (§14) once the API accepts
them, using the same status states as a manually sent campaign.

**Important:** The React frontend submits the campaign to the backend. It does not directly send email.

---

## 8. Campaign Monitoring Flow

```text
Campaign = Queued
       ↓
API polling / event updates
       ↓
Campaign = Sending
       ↓
Monitor:
   ├── Sent
   ├── Delivered
   ├── Opened
   ├── Clicked
   ├── Bounced
   ├── Complained
   └── Unsubscribed
       ↓
Campaign = Completed
```

### Campaign detail view

```text
Campaign
   ↓
Campaign Details
   ├── Overview
   ├── Recipients
   ├── Delivery
   ├── Engagement
   ├── Bounces
   ├── Unsubscribes
   └── Timeline
```

---

## 9. Contact Management Flow

```text
Contacts
   ↓
Choose operation
   ↓
┌──────────────┬───────────────┬──────────────┐
│              │               │              │
View         Create          Import         Bulk action
 │              │               │              │
 ↓              ↓               ↓              ↓
Search        Form           Select file     Select records
Filter          ↓               ↓              ↓
Sort          Validate       Validate        Confirm
Pagination       ↓               ↓              ↓
                Save          Preview          ↓
                  ↓               ↓           Execute
                  └───────────────┴─────────────┘
                                  ↓
                            Refresh contact list
```

### Contact import

```text
Upload TXT/Excel
      ↓
Preview data
      ↓
Validate
      ↓
Show errors/warnings
      ↓
Confirm import
      ↓
API import request
      ↓
Import result
      ├── Imported
      ├── Duplicates
      ├── Invalid
      ├── Suppressed
      └── Failed
```

---

## 10. Contact Details Flow

```text
Contacts
   ↓
Select contact
   ↓
Contact Profile
   ├── Personal information
   ├── Organisation
   ├── Category
   ├── Consent status
   ├── Lawful basis
   ├── Preferences
   ├── Source system
   ├── Last emailed
   └── Engagement history
```

---

## 11. Consent / Preference Flow

```text
Contact
   ↓
Consent & Preferences
   ↓
Display:
   ├── Subscription status
   ├── Lawful basis
   ├── Consent source
   └── Subscription preferences
   ↓
User/contact changes preference
   ↓
Submit change
   ↓
API
   ↓
Database updated
   ↓
Frontend displays new status
```

### Unsubscribe flow

```text
Unsubscribe
   ↓
Confirmation
   ↓
API
   ↓
Contact becomes suppressed/unsubscribed
   ↓
Frontend updates status
```

---

## 12. Analytics Flow

```text
Analytics
   ↓
Choose:
   ├── Campaign
   ├── Date range
   ├── Segment
   └── Metrics
        ↓
Request analytics
        ↓
API
        ↓
Display:
   ├── Delivery
   ├── Opens
   ├── Clicks
   ├── Bounces
   ├── Unsubscribes
   ├── Complaints
   ├── Geography
   ├── Device
   ├── Browser
   └── Email client
```

### Campaign comparison

```text
Analytics
   ↓
Compare Campaigns
   ↓
Select Campaign A
Select Campaign B
   ↓
Comparison view
```

---

## 13. Reporting Flow

```text
Reports
   ↓
Choose report type
   ↓
Select filters
   ├── Date
   ├── Campaign
   ├── Audience
   └── Metrics
   ↓
Generate report
   ↓
Display results
   ↓
 ┌─────────────┬──────────────┬───────────────┐
 │             │              │               │
 View       Export CSV    Export Excel    Schedule
                                            report
```

---

## 14. Message Log Flow

```text
Messages
   ↓
Fetch message logs
   ↓
Filter/search
   ├── Recipient
   ├── Campaign
   ├── Status
   ├── Date
   └── Event
   ↓
Select message
   ↓
Message timeline
   ├── Submitted
   ├── Queued
   ├── Sent
   ├── Delivered
   ├── Opened
   ├── Clicked
   └── Bounced/Failed
```

### Failed message

```text
Failed message
      ↓
Failure details
      ↓
Display reason
      ↓
Possible remediation/investigation
```

---

## 15. Quota Flow

```text
Dashboard / Quota
      ↓
Fetch usage
      ↓
Calculate/display percentage
      ↓
┌─────────┬─────────┬─────────┐
│ <80%    │ 80–89%  │ 90–99%  │ 100%+
│ Normal  │ Warning │ Critical│ Limit
└─────────┴─────────┴─────────┘
```

The platform provides the actual quota thresholds and alerts; the frontend displays the resulting status.

---

## 16. Administration Flow

```text
Administration
    ↓
Choose:
    ├── Quota & Alerts
    ├── Users
    ├── Roles/Permissions
    ├── Audit Log
    └── System Status
```

*System Settings (general tenant configuration) is not yet implemented in the reference build —
drop it from this list or scope it separately before building against it.*

### User administration

```text
Users
 ↓
Search
 ↓
Select user
 ↓
View/Edit
 ↓
Enable/Disable
 ↓
Assign role
 ↓
Save
```

### Role administration

```text
Roles
 ↓
Select role
 ↓
Permissions matrix
 ↓
Enable/disable permissions
 ↓
Save
```

---

## 17. Audit Log Flow

```text
Audit Logs
   ↓
Fetch logs
   ↓
Search/filter
   ├── User
   ├── Action
   ├── Resource
   ├── Date
   └── Event type
   ↓
Select event
   ↓
View details
   ↓
Download/export
```

---

## 21. System Status Flow

(*Added — referenced from §2 but not previously defined.*)

```text
System Status
   ↓
Fetch platform health from API
   ↓
Display:
   ├── Sending service status (operational / degraded / down)
   ├── API status
   ├── Queue depth / send latency
   └── Last incident (if any)
```

This is a read-only view for operators — it surfaces backend health signals the API already
tracks (per the inception report's monitoring requirements) rather than computing anything
client-side.

---

## 18. Global Frontend State Flow

Most frontend operations follow the same basic pattern:

```text
User Action
    ↓
React Component
    ↓
Client-side validation
    ↓
API Request
    ↓
Authentication / Authorization
    ↓
Backend
    ↓
Response
    ↓
Application state / API cache
    ↓
React UI update
```

### Error flow

```text
API Request
    ↓
Error
    ↓
Frontend error handler
    ↓
User-friendly error message
    ↓
Retry / Correct / Cancel
```

---

## 19. Complete End-to-End Flow

```text
LOGIN
  ↓
MFA
  ↓
RBAC / SESSION
  ↓
DASHBOARD
  ↓
Choose operation
  │
  ├── CAMPAIGN
  │      ↓
  │   Create/Edit
  │      ↓
  │   Select Audience
  │      ↓
  │   Consent/Suppression Check
  │      ↓
  │   Pre-send Validation
  │      ↓
  │   Spam / Inbox / Rendering Tests
  │      ↓
  │   Schedule / Send
  │      ↓
  │   API
  │      ↓
  │   Queued
  │      ↓
  │   Sending
  │      ↓
  │   Monitor Events
  │      ↓
  │   Campaign Analytics
  │
  ├── CONTACTS
  │      ↓
  │   Search / Create / Edit / Import
  │      ↓
  │   Validate
  │      ↓
  │   Consent / Preferences
  │      ↓
  │   Contact History
  │
  ├── ANALYTICS
  │      ↓
  │   Filter
  │      ↓
  │   Aggregate
  │      ↓
  │   Charts / Tables / Heatmaps
  │
  ├── REPORTS
  │      ↓
  │   Build
  │      ↓
  │   Generate
  │      ↓
  │   View / Export / Schedule
  │
  ├── MESSAGES
  │      ↓
  │   Search / Filter
  │      ↓
  │   Event Timeline
  │
  ├── ADMINISTRATION
  │      ↓
  │   Quota & Alerts / Users / Roles & Permissions
  │
  ├── AUDIT
  │      ↓
  │   Search / Filter
  │      ↓
  │   View / Download
  │
  └── SYSTEM STATUS
         ↓
      Service health
         ↓
      Recent incidents
```

---

## 20. Core Frontend Loop

```text
Authenticate
     ↓
Observe
     ↓
Configure
     ↓
Validate
     ↓
Submit
     ↓
Monitor
     ↓
Analyze
     ↓
Report
```

This is the core workflow around which the frontend can be organized.
