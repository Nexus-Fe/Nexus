# Cập nhật hồ sơ bằng địa chỉ chuỗi — chỉ thay đổi frontend

Written against: Nexus `c09db94461ece2dd9c74f555f3569c9a8fb5f212` (`dev`); backend source read-only, revision unavailable.

## Evidence chain

- Surface: `/account/profile`, rendered by `src/app/(auth)/account/profile/page.tsx` and `AccountProfileScreen` in `src/features/auth/AuthScreens.tsx`.
- Frontend currently submits `username`, `firstName`, `lastName`, `phoneNumber`, and an `address` object assembled from four address inputs. Email is read-only and has no form name.
- UserService `UpdateProfileApiRequest` accepts `Address` as `string?`, does not accept `Username` or `Email`, validates address length to 255 characters, assigns it to `user.Address`, and calls `SaveChangesAsync`. GET returns the stored address as a string.
- The checked-in Gateway source currently binds `PATCH /api/v1/me` to `UpdateMyProfileDto`, where `Address` is `AddressInputDto?`, and forwards the typed object to UserService. This is a hard contract conflict: sending a JSON string for `address` cannot bind to this DTO and may fail at the Gateway before reaching UserService.
- Scope: frontend profile screen only. No backend source, tests, configuration, or database changes are authorized by this request.
- Uncertainty/blocker: the deployed Gateway might differ from the inspected source. Its runtime contract must be checked before treating a frontend-only string request as usable.

## Design decision

Change the frontend profile form and request to use one address string, while keeping username and email locked and absent from every profile-update request. Preserve the current form visual system and save/error/refetch behavior.

This frontend-only plan is conditional on the Gateway that receives the request already accepting `address` as a string. With the checked-in Gateway DTO unchanged, the requested end-to-end database save cannot be guaranteed by frontend changes alone. Do not claim successful synchronization or database persistence unless a live Gateway → UserService round-trip proves it.

## Reuse

- Reuse `api.patch('/api/v1/me', ...)`, `AccountProfileScreen`'s existing `revision` refresh, and existing `.field-wrap` / `.field` styles.
- Preserve the current email display as read-only. Make username read-only and remove its `name` attribute so `FormData` cannot include it.
- Do not alter seller/warehouse address forms.

## Changes

1. `src/features/auth/AuthScreens.tsx` — `AccountProfileScreen`.
   - Replace the four province/district/ward/street inputs with one optional text input named `address`.
   - Initialize the input only from a string response: `String(p.address ?? "")`; do not coerce an object into `"[object Object]"`.
   - Set `maxLength={255}` to match UserService validation.
   - Lock username with `readOnly`, remove its `name`, and keep email read-only with no `name`.
   - Submit exactly `{ firstName, lastName, phoneNumber, address }`; `address` must always be a JSON string. Do not include `username` or `email` in the PATCH body.
   - Send an empty string when the user clears the address; UserService interprets empty string as clear, while `null` means leave the stored value unchanged.
   - Preserve busy state, error/success messages, and profile refetch after successful save.

2. Frontend request contract coverage.
   - Add or update the existing frontend test/contract check to assert `PATCH /api/v1/me` sends only `firstName`, `lastName`, `phoneNumber`, and string `address`.
   - Verify username/email controls cannot be edited and neither field appears in the request, including when profile data contains both values.
   - Verify the address field round-trips a string and enforces the 255-character limit.

## Scope

- Include: the shared Buyer, Seller, Staff, and Admin `/account/profile` screen, subject to its existing role gate.
- Backend is immutable: do not edit Gateway, UserService, backend tests, backend configuration, seeds, or database schema.
- Exclude: updating username/email, retaining structured administrative address IDs in the request, or changing other profile sections.

## Validation

- Interface: verify username and email remain visible but read-only; verify address is a single text input and limits input to 255 characters.
- Request: inspect the actual request payload and assert there are no `username` or `email` keys and `address` is a JSON string, including the empty-string clearing case.
- Compatibility gate: call the deployed Gateway with the string payload. It must accept the request, and a subsequent GET must return the persisted address. Also verify an address over 255 characters is rejected by the UI.
- Stop condition: if the deployed Gateway still uses the checked-in `AddressInputDto` contract and rejects string `address`, stop. No frontend-only encoding can make a JSON string bind to that object DTO while also sending a string to UserService; do not silently send the old object or claim the task is complete.
- Repository: run the relevant frontend typecheck/lint and frontend contract test if available. No backend command or backend file mutation is in scope.

## Stop conditions

- Stop before presenting this as a working end-to-end fix if the Gateway runtime cannot bind string `address`.
- Stop if product requirements require retaining province/district/ward identifiers as separate structured values; UserService stores one address string and the frontend-only scope cannot add storage support.

## Review note

This is a plan, not a code diff. The code-review skill's two-axis branch review needs a non-empty diff against a supplied fixed point; no review is claimed here.
