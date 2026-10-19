---
trigger: model_decision
description: "Apply when changing stock, receivables, payables, cash or bank balances, sales or purchase orders, void or return logic, tax, HPP (cost), payments, or anything that moves money or inventory."
---

# Money and stock integrity

These are invariants. A change that breaks one is wrong even if the tests you wrote pass.

## Single source of truth

- **Stock** changes only through a server operation that reads the current value under a lock and applies a delta (`adjustStock`). The client never sends an absolute stock number, and `saveProduct` ignores `stok` on update.
- **Receivables, payables, and account balances** change only by server-side delta or are derived from documents. Cash balance (`saldo`) is computed by the server under the lock.
- The server computes unit price, line totals, tax, grand total, user identity, document ID, and timestamps. Client values for these are ignored.
- Link documents to parties by **ID** (`customerId`, `supplierId`), never by display name.

## Void is not return

- **Void**: the transaction is cancelled. Keep the record, with `voidedBy`, `voidedAt`, and a required reason. It is excluded from every total, ranking, AR/AP figure, and dashboard number. Reverse its effects with new entries (reversing cash entry, stock restored); never delete rows.
- **Return**: goods came back after shipping or receiving. It adjusts stock and balances for the returned quantity only.
- Void is allowed for unshipped, unreceived, or instant POS documents. After goods moved, use return.
- Void must be idempotent (voiding twice is a no-op), must restore stock only if stock was actually deducted (not for Draft), and must not restore quantities that were already returned.

## Flows (from the Decision Log)

- Purchase order: order, release, receive, pay. Payment is its own event with an optional date. A "paid at order" checkbox is allowed. Payable arises on **receipt** for the unpaid part.
- Sales order: draft, release, ship (partial allowed, stock decreases on shipment), pay. POS checkout is instant.
- Negative stock is rejected by the server.
- Payment methods map to accounts through the Settings tables (`PaymentMethods` to `CashAccounts`). Never hard-code `'Bank'` or `'Kas Tunai'`.

## Tax and cost

- Tax is user-controlled: `taxMode` (include, exclude, none) and `ppnStatus` per document, defaults from Settings. Do not enforce tax rules and do not hard-code a rate.
- Cost (HPP): moving average updated on receipt, snapshot onto the sales line at sale. If a product's cost cannot be found, flag an anomaly. Never substitute a number.

## Writing safely

- Validate the whole operation before the first write. Aggregate duplicate lines first.
- A document and its side effects (stock, balance, cash) succeed together or are compensated and logged.
- Every mutating call carries an `opId` and is safe to retry.
- Add or update a test for each invariant you touch (see `testing-and-done`).
