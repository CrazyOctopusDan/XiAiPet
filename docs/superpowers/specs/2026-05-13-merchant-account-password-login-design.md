# Merchant Account Password Login Design

Date: 2026-05-13

## Goal

Replace the merchant miniapp's openid whitelist onboarding flow with an account-password login flow that shop operators can manage without developer intervention.

The current flow asks an unauthorized merchant user to copy their `openid`, then a developer manually inserts it into the database. That does not scale for real shop usage. The new flow uses merchant-managed accounts:

- A built-in initial `admin/admin` account can enter the merchant app.
- The initial admin account must change its password before using the workspace.
- Admin users can create and manage staff accounts.
- Staff users can do daily fulfillment work without gaining financial or account-administration privileges.

## Locked Decisions

- Merchant account-password login is independent from WeChat `openid`.
- The old openid copy/manual database update flow should be removed from the merchant login experience.
- The initial account is `admin` with password `admin`.
- The initial admin account must change its password before entering the workspace.
- No default staff account is created.
- When admin creates a staff account, the staff account's initial password is `staff`.
- Staff accounts must change their password on first login.
- Employee management is a separate merchant page visible only to admin users.
- Staff users may view customer fulfillment information needed for packing and delivery, including name, phone, address, order items, and order status.

## Recommended Approach

Create a dedicated merchant account system instead of extending the existing `merchant_users` openid whitelist.

The existing `merchant_users` model is tied to `openid` and the customer `users` relation. Reusing it for password login would conflict with the selected requirement that merchant accounts are not bound to WeChat identity. A dedicated account model keeps merchant authentication, roles, and password lifecycle explicit.

## Backend Design

Add a `merchant_accounts` data model with at least:

- `id`
- `username` unique
- `passwordHash`
- `role`: `admin` or `staff`
- `status`: `active` or `disabled`
- `mustChangePassword`
- `createdBy`
- `lastLoginAt`
- `createdAt`
- `updatedAt`

The backend should bootstrap the initial admin account if no merchant accounts exist. The bootstrap account is:

- username: `admin`
- password: `admin`
- role: `admin`
- status: `active`
- mustChangePassword: `true`

Passwords must never be stored in plaintext. Store a salted password hash using the existing Node backend, and return only account metadata to the miniapp.

## Auth Flow

Merchant login changes from `wx.login` to username/password:

1. Merchant miniapp submits username and password to a new merchant account login endpoint.
2. Backend verifies account status and password hash.
3. Backend returns a merchant session token containing account id, username, role, and `mustChangePassword`.
4. Miniapp stores the merchant session using the existing merchant API client storage pattern.
5. If `mustChangePassword` is true, the miniapp routes only to the password-change screen.
6. After password change succeeds, backend clears `mustChangePassword`, issues or allows a normal session, and the miniapp enters the workspace.

The merchant API guard should validate merchant account sessions rather than openid sessions. Existing merchant routes that currently depend on `requireMerchantSession` should continue to use a single guard entry point, but that guard should now resolve a merchant account context.

## Role And Permission Rules

Admin users can:

- Enter the full merchant workspace.
- Manage employee accounts.
- Create staff accounts.
- Disable staff accounts.
- Reset staff passwords to `staff`.
- Adjust customer stored value balances.
- Manage products, product availability, runtime configuration, and orders.

Staff users can:

- Manage product listing state and product configuration.
- View orders and customer fulfillment information needed for packing and handoff.
- Update order status for packing and fulfillment workflows.

Staff users cannot:

- Enter employee account management.
- Create, disable, or reset merchant accounts.
- Adjust customer stored value balances.
- Access sensitive admin-only configuration that affects financial or access-control behavior.

The backend must enforce these permissions. The miniapp should also hide or disable unavailable entry points, but frontend checks are only usability behavior, not security.

## Miniapp UX

Replace the access gate verification screen with an account-password login screen:

- Username field.
- Password field.
- Login button.
- Clear validation messages for missing username/password, wrong credentials, disabled account, and server failure.

Add a forced password-change screen:

- Current password.
- New password.
- Confirm new password.
- Submit button.
- This screen is mandatory for `admin/admin` and new staff accounts with initial password `staff`.

Add an admin-only employee account page:

- Staff account list.
- Create staff account.
- Disable staff account.
- Reset staff password to `staff`.
- Show first-login/change-password state where useful.

The workspace should only show the employee account entry to admin users. Staff users should see product and order workflows relevant to daily operations.

## Error Handling

Login failures should use clear, non-leaky messages:

- Missing username/password: ask the user to complete required fields.
- Wrong username/password: show a generic account or password error.
- Disabled account: show that the account has been disabled and to contact admin.
- Must change password: route to the password-change screen.
- Network/server failure: show retry guidance.

Admin-only API access attempted by staff should return a forbidden error from the backend. The miniapp should present a concise no-permission message.

## Testing

Backend tests should cover:

- Initial admin bootstrap creates `admin/admin` only when no merchant accounts exist.
- Login succeeds with correct password and fails with wrong password.
- Disabled accounts cannot log in.
- Login response includes role and `mustChangePassword`.
- Password change validates the current password and clears `mustChangePassword`.
- Admin can create, disable, and reset staff accounts.
- Staff cannot manage accounts.
- Staff cannot adjust customer stored value.
- Staff can access allowed product and order fulfillment endpoints.

Miniapp service/page tests should cover:

- Login request and session storage.
- Forced password-change routing.
- Admin-only employee entry visibility.
- Staff permission hiding for stored-value and employee management flows.
- Friendly handling of login and forbidden errors.

## Migration And Compatibility

The merchant miniapp should stop depending on openid whitelist onboarding for normal access. Existing `merchant_users` may remain for older CloudBase parity code or customer-user related functionality, but the active HTTP merchant app login path should use `merchant_accounts`.

No existing customer-facing login or order flow should change.

## Out Of Scope

- Binding merchant accounts to WeChat `openid`.
- Multi-store merchant account routing beyond the existing merchant/store assumptions.
- Fine-grained configurable permission matrices.
- Password reset by SMS, email, or WeChat verification.
- Audit log UI for every admin action.
