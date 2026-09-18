# Prisma veri modeli (özet)

Kaynak: [`prisma/schema.prisma`](./prisma/schema.prisma)

## Enum’lar

- `OrderStatus`: PENDING_PAYMENT → RECEIVED → PREPARING → READY → (DELIVERY: COURIER_ASSIGNED → ON_THE_WAY | PICKUP: AWAITING_PICKUP) → DELIVERED | CANCELLED
- `PaymentMethod`: IYZICO_ONLINE | CASH_ON_DELIVERY | CARD_ON_DELIVERY | PAY_AT_STORE
- `PaymentStatus`: PENDING | PAID | FAILED | REFUNDED | UNPAID
- `FulfillmentType`: DELIVERY | PICKUP
- `StaffRole`: SUPER_ADMIN | KITCHEN | COURIER
- `CouponType`: PERCENT | FIXED
- `OptionGroupType`: SIZE | EXTRA | REMOVABLE | COMBO | SINGLE | MULTI

## Çok şube

- `Branch` kök varlık; `branchId` Order, BranchProduct, DeliveryZone, WorkingHours, StaffMembership, Coupon üzerinde
- Katalog merkezi (`Product` / `Category` / Option*); fiyat ve görünürlük `BranchProduct`

## Sipariş snapshot

- `OrderItem.productName`, `unitPriceCents`, `OrderItemOption.name` sipariş anında kilitlenir
- `trackingToken` public takip için

## Seed

`pnpm db:seed` → tek şube `merkez`, örnek menü, admin/mutfak/kurye kullanıcıları, kupon `HOSGELDIN10`
