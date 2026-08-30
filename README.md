#💰 ExpenseTrack -- Daily Expense Tracker

ExpenseTrack is a simple and user-friendly Daily Expense Trackerthat helps users record, manage, and understand where their money goes.

The application provides account-based expense management, spendinganalytics, interactive graphs, budget tracking, data export, and accountsettings.

🚀 Main Features

👤 Authentication

User Sign Up

User Login

Demo Login

Forgot Password

Password Reset

Logout

User-specific data

Separate data for every account

Each user's expenses and settings are connected to their own account.

💸 Expense Management

Users can add daily expenses with:

Amount

Category

Date

Payment Method

Description

Expense Actions

Add expense

Edit expense

Delete expense

Delete all personal expenses

Search expenses

Filter expenses

The application uses date-based expense tracking. The Time field isintentionally not required.

📊 Spending Analytics

ExpenseTrack provides interactive spending analytics so users can easilyunderstand their money usage.

Spending Trend

The graph shows daily spending over time.

For example:

Aug 1 → ₹200
Aug 2 → ₹800
Aug 3 → ₹300
Aug 4 → ₹1,500
Aug 5 → ₹500

The graph naturally moves:

UP → DOWN → UP → DOWN

This makes high and low spending days easy to identify.

Interactive Graph

Users can:

Hover over graph points

View the exact date

View daily total spending

See category-wise expenses

Click a graph point

View individual expenses

Edit an expense

Delete an expense

The graph uses the user's real expense data and does not use random orhard-coded production data.

📈 Category Analytics

ExpenseTrack also shows where the user's money is being spent.

Example:

Food          ₹4,500
Shopping      ₹3,200
Transport     ₹1,800
Bills         ₹1,200

The application can highlight:

Highest spending category

Highest spending day

Lowest spending day

Average daily spending

Total spending

💰 Budget Tracking

Users can set a monthly budget.

Example:

Monthly Budget:  ₹10,000
Total Spent:     ₹6,500
Remaining:       ₹3,500

The dashboard can show:

Total budget

Total spent

Remaining budget

Budget usage

Budget warnings

The budget belongs only to the logged-in user.

⚙️ Account Settings

A user can access Settings directly from the account/profile button.

Example flow:

👤 Account
     ↓
⚙️ Settings
     ↓
Account Settings

Settings include:

👤 Profile

View account information

Change name

View email

🔐 Security

Change password

Password validation

🎨 Appearance

Light mode

Dark mode

System theme where supported

💰 Budget

Set monthly budget

Update budget

💱 Currency

Supported display currencies can include:

INR ₹

USD $

EUR €

GBP £

🔔 Notifications

Manage available in-app notification preferences such as:

Expense reminders

Budget warnings

Monthly summary

📊 Data Management

Export personal data

Export Excel

Export CSV

Delete all expenses

⚠️ Danger Zone

Delete account

Permanently remove the current user's data

📥 Data Export

ExpenseTrack supports exporting personal expense information.

Excel Export

Export expense data in Excel-compatible format.

Typical columns:

Date
Amount
Category
Payment Method
Description

CSV Export

Expense data can also be exported as CSV.

Personal Data Export

Users can export their own application data as JSON where supported.

Passwords and authentication secrets should never be included inexported data.

🔐 User Data Separation

One of the most important features is user-specific data.

Every expense is associated with a user ID.

Example:

{
    id: "expense123",
    userId: "user123",
    amount: 500,
    category: "Food",
    date: "2026-08-07",
    paymentMethod: "UPI",
    description: "Lunch"
}

The application only displays:

expense.userId === currentUser.id

Therefore:

User A
  ↓
User A expenses

User B
  ↓
User B expenses

User A cannot accidentally see User B's expense data through theapplication's normal user flow.

💾 Data Persistence (Supabase Cloud Database)

All data is stored in a Supabase (PostgreSQL) cloud database:

accounts & sessions   → Supabase Auth (hashed passwords, secure tokens)
expenses              → expenses table
theme/currency/budget → settings table
profile name          → profiles table

Benefits:

Data survives page refreshes, browser restarts, and works across devices
Every user only ever sees their own data (enforced by Row Level Security)
Real "Forgot password" emails with secure one-time reset links
No server to run — the site stays a static site (Netlify/Vercel)

After logout, the account's data is not deleted.

When the user logs in again, their saved expenses and settings areloaded from the database.

👉 First time? Follow SETUP-SUPABASE.md (10-minute setup: create free
   Supabase project, run supabase-schema.sql, paste 2 keys into
   js/supabase-config.js).

📅 Date-Based Expense Tracking

ExpenseTrack uses the expense date as the main timeline reference.

Example:

07-08-2026

The application does not require an expense Time field.

Daily spending is calculated by grouping expenses with the same date.

Example:

07-08-2026

Food        ₹500
Transport   ₹200
Shopping    ₹300

Daily Total = ₹1,000

This daily total is then used by the spending trend graph.

📱 Responsive Design

The application is designed to work across different screen sizes:

📱 Small mobile

📱 Mobile

📲 Tablet

💻 Laptop

🖥️ Desktop

Responsive behavior includes:

Flexible dashboard cards

Responsive charts

Mobile-friendly forms

Mobile-friendly account menu

Responsive expense tables

No unwanted horizontal page overflow

Touch-friendly graph interaction

Recommended responsive breakpoints:

Small Mobile: < 480px
Mobile:       480px – 767px
Tablet:       768px – 1199px
Desktop:      1200px+

🛠️ Technologies

HTML5

CSS3

JavaScript (ES6, no frameworks)

Supabase — cloud database (PostgreSQL) + authentication

Chart.js

Excel/CSV export functionality

HTML5

Used for the application structure and forms.

CSS3

Used for:

Layout

Responsive design

Dark mode

Cards

Forms

Navigation

Modals

JavaScript

Used for:

Authentication logic (Supabase Auth)

Expense management (Supabase / PostgreSQL)

User-specific data

Calculations

Filtering

Settings

Export functionality

Graph data preparation

Chart.js

Used to create interactive spending and category charts.

📂 Suggested Project Structure

expense-tracker/
│
├── index.html
├── login.html
├── signup.html
├── forgot-password.html
├── reset-password.html
├── dashboard.html
├── settings.html
│
├── css/
│   └── style.css
│
├── js/
│   ├── supabase-config.js   ← paste your Supabase URL + anon key here
│   ├── auth.js              ← Supabase Auth (login/signup/logout/session)
│   ├── db.js                ← database layer (expenses, settings, profile)
│   ├── dashboard.js
│   ├── charts.js
│   ├── settings.js
│   ├── login.js
│   ├── signup.js
│   ├── forgot-password.js
│   └── reset-password.js
│
├── supabase-schema.sql      ← run once in Supabase (creates tables + security)
├── SETUP-SUPABASE.md        ← 10-minute database setup guide
├── netlify/functions/       ← optional: full account deletion (Netlify)
├── api/                     ← optional: full account deletion (Vercel)
└── README.md

📊 Example Spending Flow

A typical user flow is:

Login
  ↓
Dashboard
  ↓
Add Expense
  ↓
Enter Amount, Category, Date, Payment Method, Description
  ↓
Save Expense
  ↓
Expense appears in list
  ↓
Daily spending is recalculated
  ↓
Graph updates
  ↓
Analytics update
  ↓
Budget updates

✏️ Edit Flow

Expense
  ↓
Edit
  ↓
Change amount/category/date/etc.
  ↓
Save Changes
  ↓
Daily total recalculated
  ↓
Graph updates
  ↓
Dashboard updates

🗑️ Delete Flow

Expense
  ↓
Delete
  ↓
Confirmation
  ↓
Delete selected expense
  ↓
Graph updates
  ↓
Analytics update

👤 Account Flow

Dashboard
    ↓
👤 Account
    ↓
⚙️ Settings
    ↓
Profile / Security / Budget / Appearance / Data

Logout:

Dashboard
    ↓
👤 Account
    ↓
🚪 Logout
    ↓
Login Page

Logging out does not delete the user's data.

🧪 Testing Checklist

Before deployment, verify:

Authentication

Sign Up works

Login works

Forgot Password works (real email sent)

Password reset works (via email link)

Logout redirects to Login

Protected Dashboard redirects unauthenticated users

Expenses

Add expense works

Edit expense works

Delete expense works

Delete all expenses works

Search works

Filters work

Date is saved correctly

Time is not required

Graphs

Spending graph loads

Graph uses real user data

Graph moves up/down based on daily spending

Dates are sorted correctly

Hover tooltip works

Mobile tap interaction works

Graph updates after adding an expense

Graph updates after editing an expense

Graph updates after deleting an expense

Empty graph state works

Account

Profile settings work

Change password works

Theme setting works

Budget setting works

Currency setting works

Notification settings work

Excel export works

CSV export works

Delete all expenses works

Delete account works

User Separation

User A sees only User A expenses

User B sees only User B expenses

Settings are separated by user

Budgets are separated by user

Logging out does not delete data

Responsive Design

Test at:

320px
375px
390px
430px
768px
1024px
1280px
1440px

Confirm:

No unwanted horizontal scrolling

Charts fit the screen

Forms fit the screen

Account menu works

Buttons remain accessible

Dashboard cards wrap correctly

🚀 Future Improvements

Possible future features:

Income tracking

Real savings calculation

Multiple budgets

Recurring expenses

Monthly financial reports

PDF reports

Google authentication

Mobile application

Advanced financial insights

AI-powered spending recommendations

🎯 Project Goal

The main goal of ExpenseTrack is simple:

Record where your money goes and understand your spending habits.

Instead of only showing a list of expenses, ExpenseTrack turns dailyexpense records into useful information through:

Expenses → Daily Totals → Graphs → Analytics → Budget Insights

This helps users understand their spending and make better financialdecisions.

📌 Important Note

ExpenseTrack is a personal expense-management application.

Since v2 it uses a real cloud backend (Supabase): passwords are hashed bySupabase Auth, all data lives in a PostgreSQL database, and access isenforced with Row Level Security + HTTPS. The only thing stored in thebrowser is the session token (and a cosmetic theme preference).

To connect your own database, follow SETUP-SUPABASE.md.

👨‍💻 Author

ExpenseTrack

A simple Daily Expense Tracker project built to practice anddemonstrate:

Web development

JavaScript

Data management

Authentication concepts

Interactive charts

Responsive UI

User-specific application logic
