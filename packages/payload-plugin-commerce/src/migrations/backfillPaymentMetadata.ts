// oxlint-disable no-await-in-loop
import type { CollectionSlug, FieldHook, Payload } from "payload";
import type {
  BackfillPaymentMetadataOptions,
  BackfillPaymentMetadataResult,
  LegacyOrderRecord,
  MidtransPaymentMetadata,
  PaymentMetadata,
  XenditPaymentMetadata,
} from "../types";

const resolveMidtransMetadata = (
  midtrans?: LegacyOrderRecord["midtrans"]
): MidtransPaymentMetadata | null => {
  if (!midtrans) {
    return null;
  }

  const { grossAmount, paymentType, settlementTime, transactionId } = midtrans;

  const hasData =
    Boolean(transactionId) ||
    Boolean(paymentType) ||
    Boolean(grossAmount) ||
    Boolean(settlementTime);

  if (!hasData) {
    return null;
  }

  const result: MidtransPaymentMetadata = { provider: "midtrans" };
  if (transactionId) {
    result.transactionId = transactionId;
  }
  if (paymentType) {
    result.paymentType = paymentType;
  }
  if (grossAmount) {
    result.grossAmount = grossAmount;
  }
  if (settlementTime) {
    result.settlementTime = settlementTime;
  }

  return result;
};

const resolveXenditMetadata = (
  xendit?: LegacyOrderRecord["xendit"]
): XenditPaymentMetadata | null => {
  if (!xendit) {
    return null;
  }

  const {
    amount,
    externalId,
    invoiceId,
    paidAt,
    paymentChannel,
    paymentMethod,
    status,
  } = xendit;

  const validAmount = typeof amount === "number" && !Number.isNaN(amount);

  const hasData =
    Boolean(invoiceId) ||
    Boolean(externalId) ||
    Boolean(status) ||
    validAmount ||
    Boolean(paymentMethod) ||
    Boolean(paymentChannel) ||
    Boolean(paidAt);

  if (!hasData) {
    return null;
  }

  const result: XenditPaymentMetadata = { provider: "xendit" };
  if (invoiceId) {
    result.invoiceId = invoiceId;
  }
  if (externalId) {
    result.externalId = externalId;
  }
  if (status) {
    result.status = status;
  }
  if (validAmount) {
    result.amount = amount;
  }
  if (paymentMethod) {
    result.paymentMethod = paymentMethod;
  }
  if (paymentChannel) {
    result.paymentChannel = paymentChannel;
  }
  if (paidAt) {
    result.paidAt = paidAt;
  }

  return result;
};

/**
 * Resolves polymorphic payment metadata from existing order document fields.
 * If paymentMetadata is already present and non-empty, returns it directly.
 * Otherwise, inspects legacy midtrans and xendit groups to construct
 * a normalized polymorphic record.
 */
export const resolveLegacyPaymentMetadata = (
  orderDoc?: LegacyOrderRecord | null
): PaymentMetadata | null => {
  if (!orderDoc) {
    return null;
  }

  // 1. If paymentMetadata already exists with content, preserve it
  const { paymentMetadata } = orderDoc;
  if (
    paymentMetadata !== undefined &&
    paymentMetadata !== null &&
    typeof paymentMetadata === "object" &&
    !Array.isArray(paymentMetadata) &&
    Object.keys(paymentMetadata).length > 0
  ) {
    return paymentMetadata;
  }

  // 2. Check midtrans group
  const midtransResult = resolveMidtransMetadata(orderDoc.midtrans);
  if (midtransResult) {
    return midtransResult;
  }

  // 3. Check xendit group
  const xenditResult = resolveXenditMetadata(orderDoc.xendit);
  if (xenditResult) {
    return xenditResult;
  }

  return null;
};

/**
 * Field afterRead hook that ensures reading legacy orders automatically
 * populates paymentMetadata if not yet backfilled in the database.
 */
export const populatePaymentMetadataAfterRead: FieldHook = ({
  data,
  originalDoc,
  siblingData,
  value,
}) => {
  const isPopulatedObject =
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.keys(value).length > 0;

  if (
    value !== undefined &&
    value !== null &&
    (typeof value !== "object" || isPopulatedObject)
  ) {
    return value;
  }

  let sourceDoc: LegacyOrderRecord | null = null;
  if (siblingData && typeof siblingData === "object") {
    // SAFETY: Sibling data in orders collection matches LegacyOrderRecord schema.
    sourceDoc = siblingData as LegacyOrderRecord;
  } else if (data && typeof data === "object") {
    // SAFETY: Input data in orders collection matches LegacyOrderRecord schema.
    sourceDoc = data as LegacyOrderRecord;
  } else if (originalDoc && typeof originalDoc === "object") {
    // SAFETY: Original document in orders collection matches LegacyOrderRecord schema.
    sourceDoc = originalDoc as LegacyOrderRecord;
  }

  return resolveLegacyPaymentMetadata(sourceDoc);
};

/**
 * Migration helper that scans all orders and backfills paymentMetadata
 * from legacy midtrans or xendit groups.
 */
export const backfillOrdersPaymentMetadata = async (
  payload: Payload,
  options: BackfillPaymentMetadataOptions = {}
): Promise<BackfillPaymentMetadataResult> => {
  // SAFETY: Configured or default orders collection slug conforms to CollectionSlug.
  const collection = (options.collectionSlug ?? "orders") as CollectionSlug;
  const batchSize = options.batchSize ?? 50;
  const overwrite = options.overwrite ?? false;

  let page = 1;
  let totalProcessed = 0;
  let updatedCount = 0;
  let skippedCount = 0;

  while (true) {
    const ordersResult = await payload.find({
      collection,
      depth: 0,
      limit: batchSize,
      overrideAccess: true,
      page,
    });

    if (!ordersResult.docs || ordersResult.docs.length === 0) {
      break;
    }

    const updatesToRun: (() => Promise<void>)[] = [];

    for (const doc of ordersResult.docs) {
      totalProcessed += 1;
      // SAFETY: Raw document from orders collection conforms to LegacyOrderRecord.
      const order = doc as LegacyOrderRecord;

      const existingMetadata = order.paymentMetadata;
      const hasExistingMetadata =
        existingMetadata !== undefined &&
        existingMetadata !== null &&
        typeof existingMetadata === "object" &&
        !Array.isArray(existingMetadata) &&
        Object.keys(existingMetadata).length > 0;

      if (hasExistingMetadata && !overwrite) {
        skippedCount += 1;
        continue;
      }

      const migrated = resolveLegacyPaymentMetadata(order);
      if (!migrated) {
        skippedCount += 1;
        continue;
      }

      const targetId = order.id;
      if (targetId !== undefined && targetId !== null) {
        updatesToRun.push(async () => {
          // SAFETY: Payload update input matches orders schema with backfilled polymorphic paymentMetadata.
          await payload.update({
            id: targetId,
            collection,
            overrideAccess: true,
            data: {
              paymentMetadata: migrated,
            } as never,
          });
        });
        updatedCount += 1;
      } else {
        skippedCount += 1;
      }
    }

    if (updatesToRun.length > 0) {
      await Promise.all(updatesToRun.map((fn) => fn()));
    }

    if (!ordersResult.hasNextPage) {
      break;
    }
    page += 1;
  }

  return {
    skipped: skippedCount,
    total: totalProcessed,
    updated: updatedCount,
  };
};
